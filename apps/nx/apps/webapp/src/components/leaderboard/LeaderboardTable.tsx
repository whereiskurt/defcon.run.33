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
import { Trophy, Medal, Award, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import CardMatrixLoader from '../profile/CardMatrixLoader';
import FlagSubmission from '../profile/FlagSubmission';

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
  const PAGE_SIZE = 10; // Production page size
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [searchInput, setSearchInput] = useState(''); // What user types
  const [accomplishments, setAccomplishments] = useState<Record<string, Accomplishment[]>>({});
  const [loadingAccomplishments, setLoadingAccomplishments] = useState<Set<string>>(new Set());
  const [flagSubmissionExpanded, setFlagSubmissionExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Initialize from URL params on mount
  useEffect(() => {
    const initialFilter = searchParams.get('filter') || '';
    if (initialFilter) {
      setFilter(initialFilter);
      setSearchInput(initialFilter);
      // Clear any existing timeout since we want immediate filtering from URL params
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    }
  }, [searchParams]);

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
        setPagination(data.pagination);
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
    if (filter && searchInputRef.current && !loading) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [loading, filter]);

  // Debounced search effect
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If search input is empty or less than 3 characters, clear filter immediately
    if (searchInput.length === 0) {
      setFilter('');
      setCurrentPage(1);
      return;
    }

    // If less than 3 characters, don't search yet
    if (searchInput.length < 3) {
      return;
    }

    // Set timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      setFilter(searchInput);
      setCurrentPage(1);
    }, 2000);

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

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
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Clear any existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      // Immediately apply filter
      if (searchInput.length === 0) {
        setFilter('');
      } else {
        setFilter(searchInput);
      }
      setCurrentPage(1);
    }
  };

  const handleClearSearch = () => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    // Clear search input and filter
    setSearchInput('');
    setFilter('');
    setCurrentPage(1);
    // Update URL to remove filter query param
    const url = new URL(window.location.href);
    url.searchParams.delete('filter');
    router.replace(url.pathname + (url.search ? url.search : ''));
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-600" />;
      default:
        return <span className="text-lg font-bold text-default-500">#{rank}</span>;
    }
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
    <div className="w-full space-y-4">
      {/* Flag Submission Card - Collapsible */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex justify-between items-center w-full">
            <div className="flex flex-col">
              <p className="text-lg">🚩 Submit Flag</p>
              <p className="text-small text-default-500 pb-2">Submit CTF flags to earn points</p>
            </div>
            <Button
              isIconOnly
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
            <CardBody className="pt-4">
              <FlagSubmission ghosts={ghosts} onFlagSubmissionSuccess={handleFlagSubmissionSuccess} />
            </CardBody>
          </>
        )}
      </Card>

      {/* Search and Info Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
              <div>
                <p className="text-lg">Accomplishment Leaderboard</p>
                <p className="text-small text-default-500">
                  {pagination ? `Showing ${pagination.total} participants` : 'Loading...'}
                </p>
              </div>
              <Input
                ref={searchInputRef}
                placeholder="Filter by Display Name"
                value={searchInput}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                startContent={<Search className="h-4 w-4" />}
                endContent={
                  searchInput.length > 0 && (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onClick={handleClearSearch}
                      className="min-w-unit-6 w-6 h-6"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )
                }
                className="max-w-sm"
                variant="bordered"
                description={searchInput.length > 0 && searchInput.length < 3 ? 
                  `Type ${3 - searchInput.length} more character${3 - searchInput.length === 1 ? '' : 's'} to search or press Enter` : 
                  undefined
                }
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Accordion
        selectionMode="multiple"
        variant="bordered"
        isCompact
        itemClasses={itemClasses}
        onSelectionChange={(keys) => {
          // Fetch accomplishments for expanded items
          Array.from(keys).forEach(key => {
            fetchUserAccomplishments(key as string);
          });
        }}
      >
        {users.map((user, index) => {
          return (
            <AccordionItem
              key={user.id}
              title={
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {getRankIcon(user.globalRank)}
                    <span>{user.displayname}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {user.totalPoints > 0 && (
                      <Chip 
                        className="bg-foreground text-background border-foreground" 
                        variant="bordered" 
                        size="sm"
                      >
                        {user.totalPoints} 🥕
                      </Chip>
                    )}
                    <Chip color="secondary" variant="flat" size="sm">
                      {user.accomplishmentCount} flags
                    </Chip>
                    <Chip color="success" variant="flat" size="sm">
                      Activity: {user.totalAccomplishmentType.activity}
                    </Chip>
                    <Chip color="primary" variant="flat" size="sm">
                      Social: {user.totalAccomplishmentType.social}
                    </Chip>
                    <Chip color="warning" variant="flat" size="sm">
                      CTF: {user.totalAccomplishmentType.meshctf}
                    </Chip>
                  </div>
                </div>
              }
              subtitle=""
              textValue={`${user.displayname} accomplishments`}
            >
              <div className="space-y-4">
                {/* Dynamic accomplishments loading */}
                {loadingAccomplishments.has(user.id) ? (
                  <div className="flex justify-center p-4">
                    <Spinner size="sm" />
                    <span className="ml-2 text-sm text-default-500">Loading accomplishments...</span>
                  </div>
                ) : accomplishments[user.id] && accomplishments[user.id].length > 0 ? (
                  <div>
                    <h4 className="font-semibold text-base mb-3">Individual Accomplishments</h4>
                    <div className="space-y-3">
                      {accomplishments[user.id]
                        .sort((a, b) => b.completedAt - a.completedAt)
                        .map((accomplishment, idx) => (
                          <div key={idx} className="border-l-4 border-l-gray-300 pl-4 py-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                              <Chip
                                color={getTypeColor(accomplishment.type)}
                                variant="flat"
                                size="sm"
                              >
                                {accomplishment.type.toUpperCase()}
                              </Chip>
                              <span className="font-medium text-base">{accomplishment.name}</span>
                              <span className="text-sm text-default-500">
                                {formatDate(accomplishment.completedAt)}
                              </span>
                            </div>
                            {accomplishment.description && (
                              <p className="text-sm text-default-600 mt-1">
                                {accomplishment.description}
                              </p>
                            )}
                            {accomplishment.metadata?.points && accomplishment.metadata.points > 0 && (
                              <p className="text-sm text-success-600 font-semibold mt-1">
                                +{accomplishment.metadata.points} points
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ) : accomplishments[user.id] ? (
                  <p className="text-default-500">No individual accomplishments to display.</p>
                ) : (
                  <p className="text-default-500 text-sm">Expand to load accomplishments...</p>
                )}
              </div>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
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