'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Spinner,
  Accordion,
  AccordionItem,
  Chip,
  Input,
  Button,
  Pagination,
} from '@heroui/react';
import { Search, X, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import CardMatrixLoader from '../profile/CardMatrixLoader';
import FlagSubmission from '../profile/FlagSubmission';
import PolylineRenderer from '../routes/PolylineRenderer';

type LeaderboardUser = {
  id: string;
  displayname: string;
  email: string;
  totalAccomplishmentType: {
    activity: number;
    social: number;
    meshctf: number;
  };
  accomplishmentCount: number;
  totalPoints: number;
  globalRank: number;
  mqtt_usertype?: string;
};

type Accomplishment = {
  type: 'activity' | 'social' | 'meshctf';
  name: string;
  description?: string;
  completedAt: number;
  year: number;
  metadata?: any;
};

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type GhostData = {
  id: number;
  handle: string;
  name: string;
};

type LeaderboardTableProps = {
  ghosts?: GhostData[];
};

export default function LeaderboardTable({ ghosts }: LeaderboardTableProps) {
  const PAGE_SIZE = 25; // Production page size
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  // Initialize filter and searchInput from URL params immediately
  const [filter, setFilter] = useState(() => searchParams.get('filter') || '');
  const [searchInput, setSearchInput] = useState(() => searchParams.get('filter') || ''); // What user types
  const [accomplishments, setAccomplishments] = useState<Record<string, Accomplishment[]>>({});
  const [loadingAccomplishments, setLoadingAccomplishments] = useState<Set<string>>(new Set());
  const [flagSubmissionExpanded, setFlagSubmissionExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Update state when URL params change (for navigation)
  useEffect(() => {
    const urlFilter = searchParams.get('filter') || '';
    if (urlFilter !== filter) {
      setFilter(urlFilter);
      setSearchInput(urlFilter);
      // Clear any existing timeout since we want immediate filtering from URL params
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    }
  }, [searchParams]);

  // Listen for refresh events from GPX upload modal
  useEffect(() => {
    const handleRefreshLeaderboard = () => {
      // Clear accomplishments cache and refresh leaderboard data
      setAccomplishments({});
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('refreshLeaderboard', handleRefreshLeaderboard);
    
    return () => {
      window.removeEventListener('refreshLeaderboard', handleRefreshLeaderboard);
    };
  }, []);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: PAGE_SIZE.toString(),
          ...(filter && { filter })
        });
        
        const response = await fetch(`/api/leaderboard?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        const data = await response.json();
        setUsers(data.users);
        setCurrentUserId(data.currentUserId);
        setPagination(data.pagination);
        setCurrentUser(data.currentUser || null);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [currentPage, filter, refreshTrigger]);

  // Keep focus on search input after data loads
  useEffect(() => {
    if (searchInputRef.current && !loading) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [loading]);

  // Clear filter immediately when search input is completely empty (but not when both are empty)
  useEffect(() => {
    if (searchInput.length === 0 && filter.length > 0) {
      setFilter('');
      setCurrentPage(1);
      // Also clear URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('filter');
      const newUrl = url.pathname + (url.search ? url.search : '');
      router.replace(newUrl);
    }
  }, [searchInput, filter, router]);

  const fetchUserAccomplishments = async (userId: string) => {
    if (accomplishments[userId]) {
      return; // Already loaded
    }

    setLoadingAccomplishments(prev => new Set(prev).add(userId));
    try {
      const response = await fetch(`/api/leaderboard/${userId}/accomplishments`);
      if (!response.ok) {
        throw new Error('Failed to fetch accomplishments');
      }
      const data = await response.json();
      setAccomplishments(prev => ({ ...prev, [userId]: data }));
    } catch (err) {
      console.error('Error fetching accomplishments:', err);
    } finally {
      setLoadingAccomplishments(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    // No automatic searching - only on Enter or button click
  };

  const handleSearch = () => {
    setFilter(searchInput);
    setCurrentPage(1);
    
    // Update URL with filter parameter
    const url = new URL(window.location.href);
    if (searchInput.length > 0) {
      url.searchParams.set('filter', searchInput);
    } else {
      url.searchParams.delete('filter');
    }
    const newUrl = url.pathname + (url.search ? url.search : '');
    router.replace(newUrl);
    
    // Keep focus on search input after search
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    // Clear search input and filter
    setSearchInput('');
    setFilter('');
    setCurrentPage(1);
    
    // Update URL to remove filter query param
    const url = new URL(window.location.href);
    url.searchParams.delete('filter');
    const newUrl = url.pathname + (url.search ? url.search : '');
    router.replace(newUrl);
    
    // Keep focus on search input after clearing
    setTimeout(() => {
      searchInputRef.current?.focus();
      // Force clear the input value as well
      if (searchInputRef.current) {
        searchInputRef.current.value = '';
      }
    }, 100);
  };

  const handleFastFilter = (filterValue: string) => {
    setSearchInput(filterValue);
    setFilter(filterValue);
    setCurrentPage(1);
    
    // Update URL with filter parameter
    const url = new URL(window.location.href);
    url.searchParams.set('filter', filterValue);
    const newUrl = url.pathname + (url.search ? url.search : '');
    router.replace(newUrl);
    
    // Keep focus on search input after filter
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'activity':
        return 'success';
      case 'social':
        return 'primary';
      case 'meshctf':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleFlagSubmissionSuccess = () => {
    // Refresh leaderboard data and clear accomplishments cache
    setAccomplishments({});
    setRefreshTrigger(prev => prev + 1);
  };

  const getRankIcon = (rank: number) => {
    return <span className="text-lg font-bold text-default-500">#{rank}</span>;
  };

  const getPolylineData = (metadata: any): string | null => {
    if (!metadata) return null;
    
    // Debug log to see what metadata we're getting
    console.log('Checking polyline data for metadata:', metadata);
    
    // First try summary_polyline (Strava data)
    if (metadata.summary_polyline && typeof metadata.summary_polyline === 'string') {
      console.log('Found summary_polyline:', metadata.summary_polyline.substring(0, 50) + '...');
      
      // Check if it's a JSON coordinate array first
      try {
        const coordArray = JSON.parse(metadata.summary_polyline);
        if (Array.isArray(coordArray) && coordArray.length > 0 && Array.isArray(coordArray[0])) {
          // This is a coordinate array, not a polyline string - skip for now
          console.log('Found coordinate array instead of polyline string');
          return null;
        }
      } catch {
        // If JSON parsing fails, it's likely a proper polyline string
        console.log('Using polyline string from summary_polyline');
        return metadata.summary_polyline;
      }
      
      // If JSON parsing succeeded but it's not a coordinate array, it might still be a valid polyline
      if (metadata.summary_polyline.length > 10) {
        console.log('Using polyline string (not JSON)');
        return metadata.summary_polyline;
      }
    }
    
    // Try other potential polyline fields
    const polylineFields = [
      'polyline',
      'encoded_polyline',
      'route_polyline',
      'track_polyline'
    ];
    
    for (const field of polylineFields) {
      if (metadata[field] && typeof metadata[field] === 'string' && metadata[field].length > 10) {
        console.log(`Found polyline in field: ${field}`);
        return metadata[field];
      }
    }
    
    console.log('No polyline data found');
    return null;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardBody className="p-0">
          <CardMatrixLoader text="LOADING LEADERBOARD" height="calc(100dvh - 140px)" />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardBody>
          <p className="text-red-500 text-center p-4">{error}</p>
        </CardBody>
      </Card>
    );
  }

  const itemClasses = {
    base: 'p-0',
    title: 'p-0 text-current',
    subtitle: 'p-0',
    indicator: 'text-2xl',
    content: 'text-lg',
  };

  return (
    <div className="w-full space-y-2 px-2">
      {/* Flag Submission Card - Collapsible with Overlay */}
      <Card className="bg-background/80 backdrop-blur-sm border-2 border-primary/20 shadow-lg">
        <CardHeader className="pb-0 py-2">
          <div className="flex justify-between items-center w-full">
            <div className="flex flex-col">
              <p className="text-base">🚩 Submit Flag</p>
              <p className="text-small text-default-500">Submit CTF flags to earn points</p>
            </div>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onClick={() => setFlagSubmissionExpanded(!flagSubmissionExpanded)}
              className="shrink-0"
            >
              {flagSubmissionExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {flagSubmissionExpanded && (
          <>
            <Divider />
            <CardBody className="pt-2 bg-background/90 backdrop-blur-sm">
              <FlagSubmission ghosts={ghosts} onFlagSubmissionSuccess={handleFlagSubmissionSuccess} />
            </CardBody>
          </>
        )}
      </Card>

      {/* Search and Info Card */}
      <Card>
        <CardHeader className="py-2">
          <div className="flex flex-col w-full">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <Input
                  ref={searchInputRef}
                  placeholder="Keyword Search"
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  startContent={<Search className="h-4 w-4" />}
                  endContent={
                    (searchInput.length > 0 || filter.length > 0) && (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={handleClearSearch}
                        className="min-w-unit-6 w-6 h-6"
                        title="Clear search"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )
                  }
                  className="flex-1"
                  variant="bordered"
                />
                <Button
                  size="md"
                  variant="solid"
                  color="primary"
                  onClick={handleSearch}
                  className="px-4 shrink-0"
                  disabled={searchInput.length === 0}
                >
                  Search
                </Button>
              </div>
              
              {/* Filter Chips - Hidden on mobile */}
              <div className="hidden sm:flex justify-start gap-2">
                {currentUser && (
                  <Chip
                    size="sm"
                    variant="flat"
                    color="primary"
                    className="cursor-pointer hover:bg-primary-100 transition-colors"
                    onClick={() => handleFastFilter(currentUser.displayname)}
                  >
                    {currentUser.displayname} (you!)
                  </Chip>
                )}
                <Chip
                  size="sm"
                  variant="flat"
                  color="warning"
                  className="cursor-pointer hover:bg-warning-100 transition-colors"
                  onClick={() => handleFastFilter('wildhare og')}
                >
                  ⭐️ Wild Hares
                </Chip>
                <Chip
                  size="sm"
                  variant="flat"
                  color="secondary"
                  className="cursor-pointer hover:bg-secondary-100 transition-colors"
                  onClick={() => handleFastFilter('og')}
                >
                  🤠 OG
                </Chip>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Accordion
        selectionMode="multiple"
        variant="bordered"
        isCompact
        itemClasses={itemClasses}
        className="gap-0"
        onSelectionChange={(keys) => {
          // Fetch accomplishments for expanded items
          Array.from(keys).forEach(key => {
            fetchUserAccomplishments(key as string);
          });
        }}
      >
        {users.map((user, index) => {
          const isCurrentUser = user.id === currentUserId;
          const getDisplayNameWithEmoji = (user: LeaderboardUser) => {
            let emoji = '';
            if (user.mqtt_usertype === 'wildhare') emoji = ' ⭐️';
            else if (user.mqtt_usertype === 'og') emoji = ' 🤠';
            return user.displayname + emoji;
          };
          const displayName = getDisplayNameWithEmoji(user);
          
          return (
            <AccordionItem
              key={user.id}
              className={isCurrentUser ? 'bg-green-400/20 dark:bg-green-500/30 border border-green-500/50 rounded-lg' : ''}
              title={
                <div className="flex flex-col w-full py-0.5 px-1">
                  {/* Mobile: 2-line layout */}
                  <div className="flex sm:hidden flex-col w-full -mt-0.5">
                    {/* Line 1: Rank + Points on left, Chips on right */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-default-500 shrink-0">#{user.globalRank}</span>
                        {user.totalPoints > 0 ? (
                          <Chip 
                            className="bg-foreground text-background border-foreground shrink-0" 
                            variant="bordered" 
                            size="sm"
                          >
                            {user.totalPoints} 🥕
                          </Chip>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 pt-4">
                        {(() => {
                          const types = [
                            { type: 'activity', count: user.totalAccomplishmentType.activity, color: 'success' as const },
                            { type: 'social', count: user.totalAccomplishmentType.social, color: 'primary' as const },
                            { type: 'meshctf', count: user.totalAccomplishmentType.meshctf, color: 'warning' as const }
                          ];
                          
                          // Sort by count (highest first), but maintain original order if all are zero
                          const allZero = types.every(t => t.count === 0);
                          const sortedTypes = allZero ? types : types.sort((a, b) => b.count - a.count);
                          
                          return sortedTypes.map(({ type, count, color }) => (
                            <Chip key={type} color={color} variant="flat" size="sm">
                              {count}
                            </Chip>
                          ));
                        })()}
                      </div>
                    </div>
                    {/* Line 2: Name */}
                    <div>
                      <span className={`${isCurrentUser ? 'text-green-800 dark:text-green-200 font-medium' : ''} text-sm`}>{displayName}</span>
                    </div>
                  </div>
                  {/* Desktop: 1-line layout */}
                  <div className="hidden sm:flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {getRankIcon(user.globalRank)}
                      {user.totalPoints > 0 && (
                        <Chip 
                          className="bg-foreground text-background border-foreground" 
                          variant="bordered" 
                          size="sm"
                        >
                          {user.totalPoints} 🥕
                        </Chip>
                      )}
                      <span className={`${isCurrentUser ? 'text-green-800 dark:text-green-200 font-medium' : ''} break-all text-base`}>{displayName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(() => {
                        const types = [
                          { type: 'activity', count: user.totalAccomplishmentType.activity, color: 'success' as const },
                          { type: 'social', count: user.totalAccomplishmentType.social, color: 'primary' as const },
                          { type: 'meshctf', count: user.totalAccomplishmentType.meshctf, color: 'warning' as const }
                        ];
                        
                        // Sort by count (highest first), but maintain original order if all are zero
                        const allZero = types.every(t => t.count === 0);
                        const sortedTypes = allZero ? types : types.sort((a, b) => b.count - a.count);
                        
                        return sortedTypes.map(({ type, count, color }) => (
                          <Chip key={type} color={color} variant="flat" size="sm">
                            {count}
                          </Chip>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              }
              subtitle=""
              textValue={`${displayName} accomplishments`}
            >
              <div className="space-y-2 px-2 pb-2">
                {/* Dynamic accomplishments loading */}
                {loadingAccomplishments.has(user.id) ? (
                  <div className="flex justify-center p-2">
                    <Spinner size="sm" />
                    <span className="ml-2 text-sm text-default-500">Loading accomplishments...</span>
                  </div>
                ) : accomplishments[user.id] && accomplishments[user.id].length > 0 ? (
                  <div>
                    <div className="space-y-2">
                      {accomplishments[user.id]
                        .sort((a, b) => b.completedAt - a.completedAt)
                        .map((accomplishment, idx) => {
                          const polylineData = getPolylineData(accomplishment.metadata);
                          console.log(`Accomplishment "${accomplishment.name}": has polyline = ${!!polylineData}`);
                          
                          return (
                            <div key={idx} className="border-l-2 border-l-gray-300 pl-3 py-1">
                              {polylineData ? (
                                // Two-column layout when polyline is available
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Left column: Text content */}
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold text-sm">{accomplishment.name}</h4>
                                      {accomplishment.metadata?.stravaActivityId && (
                                        <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-md">
                                          <Activity className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                                          <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">STRAVA</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                      <div className="flex items-center gap-2">
                                        <Chip
                                          color={getTypeColor(accomplishment.type)}
                                          variant="flat"
                                          size="sm"
                                        >
                                          {accomplishment.type.toUpperCase()}
                                        </Chip>
                                        {accomplishment.metadata?.points !== undefined && (
                                          <Chip 
                                            className={accomplishment.metadata.points > 0 ? "bg-foreground text-background border-foreground" : accomplishment.metadata.points === 0 ? "bg-default text-default-foreground border-default" : "bg-danger text-danger-foreground border-danger"} 
                                            variant="bordered" 
                                            size="sm"
                                          >
                                            {accomplishment.metadata.points >= 0 ? '+' : ''}{accomplishment.metadata.points} 🥕
                                          </Chip>
                                        )}
                                      </div>
                                      <span className="text-sm text-default-500">
                                        {formatDate(accomplishment.completedAt)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-default-600">{accomplishment.description || accomplishment.name}</p>
                                  </div>
                                  
                                  {/* Right column: Polyline visualization */}
                                  <div className="flex justify-start items-center">
                                    {accomplishment.metadata?.stravaActivityId ? (
                                      <a
                                        href={`https://www.strava.com/activities/${accomplishment.metadata.stravaActivityId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block hover:opacity-80 transition-opacity cursor-pointer"
                                        title="Open in Strava"
                                      >
                                        <PolylineRenderer
                                          polyline={polylineData}
                                          width={200}
                                          height={120}
                                          strokeColor="#3B82F6"
                                          strokeWidth={2}
                                          showMapTile={true}
                                        />
                                      </a>
                                    ) : (
                                      <PolylineRenderer
                                        polyline={polylineData}
                                        width={200}
                                        height={120}
                                        strokeColor="#3B82F6"
                                        strokeWidth={2}
                                        showMapTile={true}
                                      />
                                    )}
                                  </div>
                                </div>
                              ) : (
                                // Single-column layout when no polyline
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-sm">{accomplishment.name}</h4>
                                    {accomplishment.metadata?.stravaActivityId && (
                                      <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-md">
                                        <Activity className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                                        <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">STRAVA</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                    <div className="flex items-center gap-2">
                                      <Chip
                                        color={getTypeColor(accomplishment.type)}
                                        variant="flat"
                                        size="sm"
                                      >
                                        {accomplishment.type.toUpperCase()}
                                      </Chip>
                                      {accomplishment.metadata?.points !== undefined && (
                                        <Chip 
                                          className={accomplishment.metadata.points > 0 ? "bg-foreground text-background border-foreground" : accomplishment.metadata.points === 0 ? "bg-default text-default-foreground border-default" : "bg-danger text-danger-foreground border-danger"} 
                                          variant="bordered" 
                                          size="sm"
                                        >
                                          {accomplishment.metadata.points >= 0 ? '+' : ''}{accomplishment.metadata.points} 🥕
                                        </Chip>
                                      )}
                                    </div>
                                    <span className="text-sm text-default-500">
                                      {formatDate(accomplishment.completedAt)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-default-600">{accomplishment.description || accomplishment.name}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : accomplishments[user.id] ? (
                  <p className="text-default-500 text-sm p-2">No individual accomplishments to display.</p>
                ) : (
                  <p className="text-default-500 text-sm p-2">Expand to load accomplishments...</p>
                )}
              </div>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-2">
          <Pagination
            total={pagination.totalPages}
            page={pagination.page}
            onChange={setCurrentPage}
            showControls
            showShadow
            color="primary"
          />
        </div>
      )}
    </div>
  );
}