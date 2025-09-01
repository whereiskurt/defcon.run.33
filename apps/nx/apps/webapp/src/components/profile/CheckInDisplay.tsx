'use client';

import { useState, useEffect } from 'react';
import { usePersistedState } from '../../hooks/usePersistedState';
import { Card, CardBody, CardHeader, Divider, Chip, Button, Spinner, Skeleton, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react';
import dynamic from 'next/dynamic';
import { MapPin, Clock, Target, Smartphone, Activity, Zap, Map, Plus, ChevronDown, ChevronUp, ExternalLink, Lock, Globe, Maximize2, Circle, Trash2 } from 'lucide-react';

// Dynamically import the map component to avoid SSR issues
const CheckInMap = dynamic(() => import('./CheckInMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-default-100 rounded-lg flex flex-col items-center justify-center gap-3">
      <Spinner size="lg" color="primary" />
      <div className="text-default-500 text-sm">Loading map...</div>
    </div>
  )
});

interface GPSSample {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface CheckIn {
  date?: string;
  timestamp?: number;
  source?: string;
  samples?: any;
  averageCoordinates?: {
    latitude?: number;
    longitude?: number;
  };
  bestAccuracy?: number;
  userAgent?: string;
  isPrivate?: boolean;
  checkInId?: string;
  checkInType?: 'Basic' | 'OTP' | 'With Flag' | 'Manual';
}

interface CheckInDisplayProps {
  remainingQuota?: number;
  onOpenCheckInModal: () => void;
}

interface MovementAnalysis {
  totalDistance: number;
  maxDistance: number;
  avgDistance: number;
  isMoving: boolean;
  movementType: 'stationary' | 'walking' | 'running' | 'vehicle';
  variance: number;
  suspiciousPatterns: string[];
}

// Calculate distance between two GPS points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
}

// Analyze movement patterns from GPS samples
function analyzeMovement(samples: GPSSample[]): MovementAnalysis {
  if (samples.length < 2) {
    return {
      totalDistance: 0,
      maxDistance: 0,
      avgDistance: 0,
      isMoving: false,
      movementType: 'stationary',
      variance: 0,
      suspiciousPatterns: ['Insufficient samples for analysis']
    };
  }

  const distances: number[] = [];
  let totalDistance = 0;
  const timeSpan = (samples[samples.length - 1].timestamp - samples[0].timestamp) / 1000; // seconds
  
  // Calculate distances between consecutive samples
  for (let i = 1; i < samples.length; i++) {
    const distance = calculateDistance(
      samples[i-1].latitude, samples[i-1].longitude,
      samples[i].latitude, samples[i].longitude
    );
    distances.push(distance);
    totalDistance += distance;
  }

  const maxDistance = Math.max(...distances);
  const avgDistance = distances.length > 0 ? totalDistance / distances.length : 0;
  
  // Calculate variance in distances
  const mean = avgDistance;
  const variance = distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / distances.length;
  
  // Calculate average speed (m/s)
  const avgSpeed = totalDistance / timeSpan;
  
  // Analyze patterns
  const suspiciousPatterns: string[] = [];
  let movementType: MovementAnalysis['movementType'] = 'stationary';
  let isMoving = false;

  // Check for suspicious patterns
  if (maxDistance < 5 && totalDistance < 10) {
    suspiciousPatterns.push('Little or no movement detected');
    movementType = 'stationary';
  } else if (maxDistance < 2 && samples.length >= 4) {
    suspiciousPatterns.push('Consistent positioning');
    movementType = 'stationary';
  } else {
    isMoving = true;
    
    // Determine movement type based on speed and distance patterns
    if (avgSpeed < 1.5) { // < 1.5 m/s ≈ 3.4 mph
      movementType = 'walking';
    } else if (avgSpeed < 4.5) { // < 4.5 m/s ≈ 10 mph
      movementType = 'running';
    } else {
      movementType = 'vehicle';
      if (avgSpeed > 15) { // > 15 m/s ≈ 33 mph
        suspiciousPatterns.push('Very high speed detected');
      }
    }
  }

  // Check for perfectly linear movement (could indicate simulation)
  if (samples.length >= 3 && variance < 1 && totalDistance > 20) {
    suspiciousPatterns.push('Unnaturally linear movement');
  }

  // Check for impossible accuracy consistency
  const accuracyVariance = samples.reduce((sum, s, i, arr) => {
    if (i === 0) return 0;
    return sum + Math.abs(s.accuracy - arr[i-1].accuracy);
  }, 0) / Math.max(1, samples.length - 1);
  
  if (accuracyVariance < 0.1 && samples.length > 3) {
    suspiciousPatterns.push('Consistent GPS accuracy');
  }

  return {
    totalDistance,
    maxDistance,
    avgDistance,
    isMoving,
    movementType,
    variance,
    suspiciousPatterns
  };
}

export default function CheckInDisplay({ remainingQuota = 50, onOpenCheckInModal }: CheckInDisplayProps) {
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [mapEnabled, setMapEnabled] = useState(true);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [currentCheckIns, setCurrentCheckIns] = useState<CheckIn[]>([]);
  const [currentQuota, setCurrentQuota] = useState(remainingQuota);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [isExpanded, setIsExpanded] = usePersistedState<boolean>('profile-checkin-expanded', false);
  const [selectedCheckInForPrivacy, setSelectedCheckInForPrivacy] = useState<CheckIn | null>(null);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const {isOpen: isPrivacyModalOpen, onOpen: onPrivacyModalOpen, onOpenChange: onPrivacyModalOpenChange} = useDisclosure();
  const [selectedCheckInForDelete, setSelectedCheckInForDelete] = useState<CheckIn | null>(null);
  const [isDeletingCheckIn, setIsDeletingCheckIn] = useState(false);
  const {isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onOpenChange: onDeleteModalOpenChange} = useDisclosure();

  // Sort check-ins by timestamp (most recent first)
  const sortedCheckIns = currentCheckIns.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return minutes === 1 ? '1 min' : `${minutes} mins`;
    if (hours < 24) return hours === 1 ? '1 hr' : `${hours} hrs`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return days === 1 ? '1 day' : `${days} days`;
    if (weeks < 4) return weeks === 1 ? '1 week' : `${weeks} weeks`;
    if (months < 12) return months === 1 ? '1 mth' : `${months} mths`;
    if (months >= 12) return years === 1 ? '1 year' : `${years}+ years`;
    return years === 1 ? '1 year' : `${years} years`;
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // Function to fetch check-ins data
  const fetchCheckIns = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
      setCursor(undefined);
    }
    
    try {
      // Fetch check-ins from new endpoint
      const checkInsResponse = await fetch('/api/user/checkins?limit=100', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (checkInsResponse.ok) {
        const checkInsData = await checkInsResponse.json();
        setCurrentCheckIns(checkInsData.checkIns || []);
        setHasMore(checkInsData.hasMore || false);
        setCursor(checkInsData.cursor);
      }
      
      // Fetch user quota
      const userResponse = await fetch('/api/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setCurrentQuota(userData.user?.quota?.checkIns ?? 50);
      }
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  // Function to refresh check-ins (wrapper for backward compatibility)
  const refreshCheckIns = () => fetchCheckIns(true);

  // Function to toggle check-in privacy
  const handlePrivacyToggle = (checkIn: CheckIn) => {
    setSelectedCheckInForPrivacy(checkIn);
    onPrivacyModalOpen();
  };

  // Function to update check-in privacy
  const updateCheckInPrivacy = async () => {
    if (!selectedCheckInForPrivacy) return;

    setIsUpdatingPrivacy(true);
    try {
      const response = await fetch(`/api/check-in/privacy`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkInId: selectedCheckInForPrivacy.checkInId,
          timestamp: selectedCheckInForPrivacy.timestamp,
          isPrivate: !selectedCheckInForPrivacy.isPrivate
        }),
      });

      if (response.ok) {
        // Update the local state
        setCurrentCheckIns(prev => prev.map(checkIn => 
          checkIn.timestamp === selectedCheckInForPrivacy.timestamp && 
          checkIn.checkInId === selectedCheckInForPrivacy.checkInId
            ? { ...checkIn, isPrivate: !checkIn.isPrivate }
            : checkIn
        ));
        onPrivacyModalOpenChange();
        setSelectedCheckInForPrivacy(null);
      } else {
        console.error('Failed to update privacy setting');
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  // Function to handle delete check-in
  const handleDeleteCheckIn = (checkIn: CheckIn) => {
    setSelectedCheckInForDelete(checkIn);
    onDeleteModalOpen();
  };

  // Function to delete check-in
  const deleteCheckInConfirmed = async () => {
    if (!selectedCheckInForDelete) return;

    setIsDeletingCheckIn(true);
    try {
      const response = await fetch(`/api/check-in/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkInId: selectedCheckInForDelete.checkInId,
          timestamp: selectedCheckInForDelete.timestamp
        }),
      });

      if (response.ok) {
        // Remove the check-in from local state
        setCurrentCheckIns(prev => prev.filter(checkIn => 
          !(checkIn.timestamp === selectedCheckInForDelete.timestamp && 
            checkIn.checkInId === selectedCheckInForDelete.checkInId)
        ));
        onDeleteModalOpenChange();
        setSelectedCheckInForDelete(null);
        
        // Trigger refresh events
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('userUpdated'));
          window.dispatchEvent(new CustomEvent('checkInUpdated'));
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to delete check-in:', errorData.error);
      }
    } catch (error) {
      console.error('Error deleting check-in:', error);
    } finally {
      setIsDeletingCheckIn(false);
    }
  };

  // Initial fetch of check-ins
  useEffect(() => {
    fetchCheckIns();
  }, []);

  // Update quota when prop changes
  useEffect(() => {
    setCurrentQuota(remainingQuota);
  }, [remainingQuota]);

  // Auto-expand if user has check-ins and no preference is saved
  useEffect(() => {
    if (!isLoading && currentCheckIns.length > 0) {
      // Check if we have a saved preference
      const stored = localStorage.getItem('profile-checkin-expanded');
      if (stored === null) {
        // No saved preference, default to expanded for users with check-ins
        setIsExpanded(true);
      }
    }
  }, [isLoading, currentCheckIns.length]);

  // Listen for check-in updates
  useEffect(() => {
    const handleCheckInUpdate = () => {
      fetchCheckIns(true);
    };

    window.addEventListener('checkInUpdated', handleCheckInUpdate);
    
    return () => {
      window.removeEventListener('checkInUpdated', handleCheckInUpdate);
    };
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex justify-between items-center pb-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">CheckIn</h3>
                <Skeleton className="w-6 h-4 rounded">
                  <div className="h-4 w-6 bg-default-300"></div>
                </Skeleton>
              </div>
              <p className="text-sm text-default-500">Location history</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              size="lg"
              variant="flat"
              color="primary"
              isIconOnly
              disabled
            >
              <Map className="w-6 h-6" />
            </Button>
            <Button
              size="lg"
              variant="flat"
              color="secondary"
              isIconOnly
              disabled
            >
              <Maximize2 className="w-6 h-6" />
            </Button>
            <Button
              size="lg"
              color="success"
              variant="flat"
              isIconOnly
              disabled
            >
              <Plus className="w-6 h-6" />
            </Button>
            <Button 
              isIconOnly 
              variant="light" 
              size="sm"
              disabled
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <Divider />
      </Card>
    );
  }

  if (currentCheckIns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            <h3 className="text-lg font-semibold">CheckIn</h3>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="text-center py-8 space-y-4">
            <div className="text-default-400">
              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No check-ins recorded yet</p>
            </div>
            <Button
              color="success"
              variant="flat"
              startContent={<Plus className="w-6 h-6" />}
              isDisabled={currentQuota <= 0}
              onPress={onOpenCheckInModal}
            >
              {currentQuota <= 0 ? 'Quota Exceeded' : 'Record Check-In'}
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader className="flex justify-between items-center pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">CheckIn</h3>
              <Chip size="sm" variant="flat" color="primary">
                {currentCheckIns.length}
              </Chip>
            </div>
            <p className="text-sm text-default-500">Location history</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            size="lg"
            variant={mapEnabled ? "solid" : "flat"}
            color="primary"
            isIconOnly
            onPress={() => {
              if (mapEnabled) {
                // Disable map
                setMapEnabled(false);
                setShowMap(false);
              } else {
                // Enable map and show it (reset)
                setMapEnabled(true);
                setShowMap(true);
              }
            }}
            aria-label={mapEnabled ? 'Disable Map' : 'Enable Map'}
          >
            <Map className="w-6 h-6" />
          </Button>
          <Button
            size="lg"
            variant={isMapExpanded ? "solid" : "flat"}
            color="secondary"
            isIconOnly
            isDisabled={!mapEnabled}
            aria-label={isMapExpanded ? 'Shrink Map' : 'Expand Map'}
            onPress={() => {
              // If card is collapsed, expand it first
              if (!isExpanded) {
                setIsExpanded(true);
              }
              setIsMapExpanded(!isMapExpanded);
            }}
          >
            <Maximize2 className="w-6 h-6" />
          </Button>
          <Button
            size="lg"
            color="success"
            variant="flat"
            isIconOnly
            isDisabled={currentQuota <= 0}
            aria-label={currentQuota <= 0 ? 'Quota Exceeded' : 'New Check-In'}
            onPress={onOpenCheckInModal}
          >
            <Plus className="w-6 h-6" />
          </Button>
          <Button 
            isIconOnly 
            variant="light" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <Divider />
      {isExpanded && (
        <CardBody className="gap-4 relative">
        {isRefreshing && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Spinner size="lg" color="primary" />
              <span className="text-sm text-default-500">Refreshing check-ins...</span>
            </div>
          </div>
        )}
        
        {showMap && mapEnabled && (
          <div className={`${isMapExpanded ? 'h-[32rem]' : 'h-64'} rounded-lg overflow-hidden relative z-10 transition-all duration-300`}>
            <CheckInMap 
              checkIns={sortedCheckIns}
              selectedCheckIn={selectedCheckIn}
              onCheckInSelect={setSelectedCheckIn}
              isExpanded={isMapExpanded}
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedCheckIns.slice(0, visibleCount).map((checkIn, index) => (
              <div
                key={index}
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  selectedCheckIn === checkIn
                    ? 'border-primary bg-primary-50'
                    : 'border-default-200 hover:border-default-300'
                }`}
                onClick={() => {
                  const wasSelected = selectedCheckIn === checkIn;
                  setSelectedCheckIn(wasSelected ? null : checkIn);
                  
                  if (!wasSelected && mapEnabled) {
                    setShowMap(true);
                    // If card is collapsed, expand it to show the map
                    if (!isExpanded) {
                      setIsExpanded(true);
                    }
                  }
                  // When unselecting, keep the map showing with all points
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm border border-primary/30">
                      {index + 1}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-default-400" />
                      <span className="text-sm font-medium">
                        {formatRelativeTime(checkIn.timestamp || 0)}
                      </span>
                      <Chip size="sm" variant="flat" color="success">
                        {checkIn.source === 'Web GPS' ? 'Web' : checkIn.source}
                      </Chip>
                      <Chip 
                        size="sm" 
                        variant="flat" 
                        color={checkIn.isPrivate ? "warning" : "primary"}
                        title={checkIn.isPrivate ? "Private - Click to make public" : "Public - Click to make private"}
                        className="px-2 cursor-pointer hover:opacity-80"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrivacyToggle(checkIn);
                        }}
                      >
                        {checkIn.isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                      </Chip>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-default-500">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>
                        {formatCoordinates(
                          checkIn.averageCoordinates?.latitude || 0,
                          checkIn.averageCoordinates?.longitude || 0
                        )}
                      </span>
                    </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      size="sm"
                      variant="light"
                      as="a"
                      href={`https://www.openstreetmap.org/?mlat=${checkIn.averageCoordinates?.latitude}&mlon=${checkIn.averageCoordinates?.longitude}#map=17/${checkIn.averageCoordinates?.latitude}/${checkIn.averageCoordinates?.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View on OpenStreetMap"
                      className="text-xs"
                      endContent={<ExternalLink className="w-3 h-3" />}
                    >
                      Map
                    </Button>
                    {(() => {
                      const movement = analyzeMovement(checkIn.samples || []);
                      const getMovementIcon = () => {
                        switch (movement.movementType) {
                          case 'running': return <Zap className="w-3 h-3 text-success" />;
                          case 'walking': return <Activity className="w-3 h-3 text-primary" />;
                          case 'vehicle': return <Target className="w-3 h-3 text-warning" />;
                          default: return <Circle className="w-3 h-3 text-default-500" />;
                        }
                      };
                      
                      return (
                        <div className="flex items-center gap-1 text-xs">
                          {getMovementIcon()}
                          <span className={movement.isMoving ? 'text-success' : 'text-default-500'}>
                            {(() => {
                              switch (movement.movementType) {
                                case 'stationary': return 'Stationary';
                                case 'walking': return 'Walking';
                                case 'vehicle': return 'Vehicle';
                                case 'running': return 'Running';
                                default: return 'Stationary';
                              }
                            })()}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                {selectedCheckIn === checkIn && (() => {
                  const movement = analyzeMovement(checkIn.samples || []);
                  return (
                    <div className="mt-2 pt-2 border-t border-default-200 space-y-1">
                      {/* Compact timestamp and movement stats in one line */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="text-default-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(checkIn.timestamp || 0).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {movement.movementType === 'stationary' ? (
                            null
                          ) : (
                            <>
                              {(() => {
                                const icon = movement.movementType === 'running' ? <Zap className="w-3 h-3 text-success" /> :
                                           movement.movementType === 'walking' ? <Activity className="w-3 h-3 text-primary" /> :
                                           <Target className="w-3 h-3 text-warning" />;
                                return icon;
                              })()}
                              <span className="font-medium">
                                {movement.totalDistance.toFixed(0)}m total
                              </span>
                              <span className="text-default-400">•</span>
                              <span>
                                {movement.maxDistance.toFixed(0)}m max
                              </span>
                              <span className="text-default-400">•</span>
                              <span>
                                {movement.avgDistance.toFixed(0)}m avg
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Attributes - replacing suspicious patterns with descriptive terms */}
                      {movement.suspiciousPatterns.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {movement.suspiciousPatterns.map((pattern, idx) => {
                            // Transform suspicious language to descriptive attributes
                            let attribute = pattern;
                            let color: "default" | "primary" | "success" | "warning" = "default";
                            
                            if (pattern.includes('Little or no movement')) {
                              return null; // Skip stationary chip
                            }
                            if (pattern.includes('Consistent positioning')) {
                              attribute = 'Stable position';
                              color = 'primary';
                            } else if (pattern.includes('linear movement')) {
                              attribute = 'Direct path';
                              color = 'primary';
                            } else if (pattern.includes('Consistent GPS')) {
                              return null; // Skip this chip
                            } else if (pattern.includes('high speed')) {
                              attribute = 'High velocity';
                              color = 'warning';
                            } else if (pattern.includes('Insufficient samples')) {
                              // Skip this chip, we'll show check-in type instead
                              return null;
                            }
                            
                            return (
                              <Chip
                                key={idx}
                                size="sm"
                                variant="flat"
                                color={color}
                              >
                                {attribute}
                              </Chip>
                            );
                          }).filter(Boolean)}
                        </div>
                      )}

                      {/* Check-in Type and GPS Sample Summary */}
                      <div className="text-xs text-default-500">
                        <Chip
                          size="sm"
                          variant="flat"
                          color={(checkIn.checkInType || 'Basic') === 'Manual' ? 'secondary' : 
                                 (checkIn.checkInType || 'Basic') === 'OTP' ? 'success' :
                                 (checkIn.checkInType || 'Basic') === 'With Flag' ? 'warning' : 'primary'}
                          className="mr-2"
                        >
                          {(checkIn.checkInType || 'Basic') === 'Manual' ? '📍 Manual' :
                           (checkIn.checkInType || 'Basic') === 'OTP' ? '🔑 OTP' :
                           (checkIn.checkInType || 'Basic') === 'With Flag' ? '🚩 Flag' : '📡 GPS'}
                        </Chip>
                        {(checkIn.checkInType || 'Basic') !== 'Manual' && (
                          <span className="font-medium">{(checkIn.samples || []).length} GPS points</span>
                        )}
                        {(checkIn.samples || []).length > 0 && (() => {
                          const accuracies = (checkIn.samples || []).map((s: any) => s.accuracy);
                          const bestAccuracy = Math.min(...accuracies);
                          const avgAccuracy = accuracies.reduce((a: number, b: number) => a + b, 0) / accuracies.length;
                          return (
                            <span className="ml-2">
                              • Best ±{bestAccuracy.toFixed(0)}m
                              • Avg ±{avgAccuracy.toFixed(0)}m
                            </span>
                          );
                        })()}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        {checkIn.userAgent ? (
                          <div className="text-default-400">
                            <Smartphone className="w-3 h-3 inline mr-1" />
                            {checkIn.userAgent.split(' ')[0]}
                          </div>
                        ) : (
                          <div></div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            className="h-5 px-1 text-xs min-w-unit-6"
                            isIconOnly
                            onPress={() => handleDeleteCheckIn(checkIn)}
                            title="Delete check-in"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="light"
                            color="primary"
                            className="h-5 px-2 text-xs"
                            onPress={() => handlePrivacyToggle(checkIn)}
                          >
                            {checkIn.isPrivate ? "Make Public" : "Make Private"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
          
          {currentCheckIns.length > visibleCount && (
            <div className="text-center pt-3">
              <Button
                variant="flat"
                color="primary"
                size="lg"
                onPress={() => setVisibleCount(prev => prev + 10)}
                className="w-full sm:w-auto"
              >
                Load More ({visibleCount} of {currentCheckIns.length})
              </Button>
            </div>
          )}
        </div>
        </CardBody>
      )}
    </Card>
    
    {/* Privacy Toggle Confirmation Modal */}
    <Modal isOpen={isPrivacyModalOpen} onOpenChange={onPrivacyModalOpenChange} size="sm">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="pb-2">
              {selectedCheckInForPrivacy?.isPrivate ? 'Make Public' : 'Make Private'}
            </ModalHeader>
            <ModalBody className="py-2">
              <p>
                Change privacy of this checkin to {' '}
                <strong>
                  {selectedCheckInForPrivacy?.isPrivate ? 'public' : 'private'}
                </strong>
                ?
              {selectedCheckInForPrivacy?.isPrivate ? (
                <>This check-in will become visible to others.</>
              ) : (
                <>This check-in will not be visible to others.</>
              )}
              </p>
            </ModalBody>
            <ModalFooter className="pt-2">
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button 
                color="primary" 
                onPress={updateCheckInPrivacy}
                isLoading={isUpdatingPrivacy}
              >
                {selectedCheckInForPrivacy?.isPrivate ? 'Make Public' : 'Make Private'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>

    {/* Delete Confirmation Modal */}
    <Modal isOpen={isDeleteModalOpen} onOpenChange={onDeleteModalOpenChange} size="sm">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="pb-2">
              Delete Check-In
            </ModalHeader>
            <ModalBody className="py-2">
              <p>
                Are you sure you want to delete this check-in? This action cannot be undone.
              </p>
              {selectedCheckInForDelete && (
                <div className="mt-2 p-2 bg-danger-50 rounded-lg">
                  <div className="text-xs text-danger-600">
                    <strong>Date:</strong> {selectedCheckInForDelete.timestamp ? 
                      new Date(selectedCheckInForDelete.timestamp).toLocaleString() : 'Unknown'}
                  </div>
                  {selectedCheckInForDelete.averageCoordinates && (
                    <div className="text-xs text-danger-600 mt-1">
                      <strong>Location:</strong> {selectedCheckInForDelete.averageCoordinates.latitude?.toFixed(6)}, {selectedCheckInForDelete.averageCoordinates.longitude?.toFixed(6)}
                    </div>
                  )}
                </div>
              )}
            </ModalBody>
            <ModalFooter className="pt-2">
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button 
                color="danger" 
                onPress={deleteCheckInConfirmed}
                isLoading={isDeletingCheckIn}
              >
                Delete
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
    </>
  );
}