'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Divider, Chip, Button } from '@heroui/react';
import dynamic from 'next/dynamic';
import { MapPin, Clock, Target, Smartphone, Activity, AlertTriangle, CheckCircle, Zap, Map, Plus } from 'lucide-react';

// Dynamically import the map component to avoid SSR issues
const CheckInMap = dynamic(() => import('./CheckInMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-default-100 rounded-lg flex items-center justify-center">
      <div className="text-default-500">Loading map...</div>
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
}

interface CheckInDisplayProps {
  checkIns?: CheckIn[];
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
    suspiciousPatterns.push('Very little movement detected');
    movementType = 'stationary';
  } else if (maxDistance < 2 && samples.length >= 4) {
    suspiciousPatterns.push('Suspiciously consistent position');
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
    suspiciousPatterns.push('Suspiciously consistent GPS accuracy');
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

export default function CheckInDisplay({ checkIns = [], remainingQuota = 50, onOpenCheckInModal }: CheckInDisplayProps) {
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [currentCheckIns, setCurrentCheckIns] = useState<CheckIn[]>(checkIns);
  const [currentQuota, setCurrentQuota] = useState(remainingQuota);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    if (minutes < 60) return minutes === 1 ? '1 minute' : `${minutes} minutes`;
    if (hours < 24) return hours === 1 ? '1 hr' : `${hours} hrs`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return days === 1 ? '1 day' : `${days} days`;
    if (weeks < 4) return weeks === 1 ? '1 week' : `${weeks} weeks`;
    if (months < 12) return months === 1 ? '1 month' : `${months} months`;
    if (months >= 12) return years === 1 ? '1 year' : `${years}+ years`;
    return years === 1 ? '1 year' : `${years} years`;
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // Function to refresh check-ins data
  const refreshCheckIns = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentCheckIns(data.user?.checkIns || []);
        setCurrentQuota(data.user?.quota?.checkIns ?? 50);
      }
    } catch (error) {
      console.error('Error refreshing check-ins:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Update state when props change
  useEffect(() => {
    setCurrentCheckIns(checkIns);
    setCurrentQuota(remainingQuota);
  }, [checkIns, remainingQuota]);

  // Listen for check-in updates
  useEffect(() => {
    const handleCheckInUpdate = () => {
      refreshCheckIns();
    };

    window.addEventListener('checkInUpdated', handleCheckInUpdate);
    
    return () => {
      window.removeEventListener('checkInUpdated', handleCheckInUpdate);
    };
  }, []);

  if (currentCheckIns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Check-Ins</h3>
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
              startContent={<Plus className="w-4 h-4" />}
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            <Chip size="sm" variant="flat" color="primary">
              {currentCheckIns.length}
            </Chip>
            <h3 className="text-lg font-semibold">Check-Ins</h3>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              size="sm"
              variant={showMap ? "solid" : "flat"}
              color="primary"
              isIconOnly
              onPress={() => setShowMap(!showMap)}
              aria-label={showMap ? 'Hide Map' : 'Show Map'}
            >
              <Map className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              color="success"
              variant="flat"
              isIconOnly
              isDisabled={currentQuota <= 0}
              aria-label={currentQuota <= 0 ? 'Quota Exceeded' : 'New Check-In'}
              onPress={onOpenCheckInModal}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="gap-4">
        {showMap && (
          <div className="h-64 rounded-lg overflow-hidden">
            <CheckInMap 
              checkIns={sortedCheckIns}
              selectedCheckIn={selectedCheckIn}
              onCheckInSelect={setSelectedCheckIn}
            />
          </div>
        )}

        <div className="space-y-3">
          <h4 className="font-medium text-sm text-default-600">Recent Check-Ins</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sortedCheckIns.slice(0, 10).map((checkIn, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedCheckIn === checkIn
                    ? 'border-primary bg-primary-50'
                    : 'border-default-200 hover:border-default-300'
                }`}
                onClick={() => {
                  setSelectedCheckIn(selectedCheckIn === checkIn ? null : checkIn);
                  if (!showMap) setShowMap(true);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-default-400" />
                      <span className="text-sm sm:text-sm text-xs font-medium">
                        {formatRelativeTime(checkIn.timestamp || 0)}
                      </span>
                      <Chip size="sm" variant="flat" color="success">
                        {checkIn.source === 'Web GPS' ? 'Web' : checkIn.source}
                      </Chip>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-default-500">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {formatCoordinates(
                          checkIn.averageCoordinates?.latitude || 0,
                          checkIn.averageCoordinates?.longitude || 0
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-default-400">
                      ±{(checkIn.bestAccuracy || 0).toFixed(1)}m
                    </div>
                    {(() => {
                      const movement = analyzeMovement(checkIn.samples || []);
                      const getMovementIcon = () => {
                        switch (movement.movementType) {
                          case 'running': return <Zap className="w-3 h-3 text-success" />;
                          case 'walking': return <Activity className="w-3 h-3 text-primary" />;
                          case 'vehicle': return <Target className="w-3 h-3 text-warning" />;
                          default: return <AlertTriangle className="w-3 h-3 text-default-500" />;
                        }
                      };
                      
                      return (
                        <div className="flex items-center gap-1 text-xs">
                          {getMovementIcon()}
                          <span className={movement.isMoving ? 'text-success' : 'text-default-500'}>
                            {(() => {
                              switch (movement.movementType) {
                                case 'stationary': return 'no move';
                                case 'walking': return 'avg.';
                                case 'vehicle': return 'fast';
                                case 'running': return 'running';
                                default: return 'no move';
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
                    <div className="mt-3 pt-3 border-t border-default-200 space-y-3">
                      {/* Exact timestamp */}
                      <div className="text-xs text-default-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Exact time: {new Date(checkIn.timestamp || 0).toLocaleString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </div>

                      {/* Movement Analysis Header */}
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">Movement Analysis</span>
                        {movement.suspiciousPatterns.length > 0 && (
                          <AlertTriangle className="w-4 h-4 text-warning" />
                        )}
                      </div>

                      {/* Movement Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-default-400">Movement Type:</span>
                          <div className="flex items-center gap-1 font-medium">
                            {(() => {
                              switch (movement.movementType) {
                                case 'running': return <><Zap className="w-3 h-3 text-success" /> Running</>;
                                case 'walking': return <><Activity className="w-3 h-3 text-primary" /> Avg. Speed</>;
                                case 'vehicle': return <><Target className="w-3 h-3 text-warning" /> Fast</>;
                                default: return <><AlertTriangle className="w-3 h-3 text-default-500" /> No Move</>;
                              }
                            })()}
                          </div>
                        </div>
                        <div>
                          <span className="text-default-400">Total Distance:</span>
                          <div className="font-medium">{movement.totalDistance.toFixed(1)}m</div>
                        </div>
                        <div>
                          <span className="text-default-400">Max Jump:</span>
                          <div className="font-medium">{movement.maxDistance.toFixed(1)}m</div>
                        </div>
                        <div>
                          <span className="text-default-400">Avg Distance:</span>
                          <div className="font-medium">{movement.avgDistance.toFixed(1)}m</div>
                        </div>
                      </div>

                      {/* Movement Validation */}
                      <div>
                        <span className="text-default-400 text-xs">Movement Validation:</span>
                        <div className="flex items-center gap-2 mt-1">
                          {movement.isMoving ? (
                            <Chip size="sm" variant="flat" color="success" startContent={<CheckCircle className="w-3 h-3" />}>
                              Active Movement Detected
                            </Chip>
                          ) : (
                            <Chip size="sm" variant="flat" color="default" startContent={<AlertTriangle className="w-3 h-3" />}>
                              No Movement
                            </Chip>
                          )}
                        </div>
                      </div>

                      {/* Suspicious Patterns */}
                      {movement.suspiciousPatterns.length > 0 && (
                        <div>
                          <span className="text-default-400 text-xs">Anomalies Detected:</span>
                          <div className="space-y-1 mt-1">
                            {movement.suspiciousPatterns.map((pattern, idx) => (
                              <Chip
                                key={idx}
                                size="sm"
                                variant="flat"
                                color="warning"
                                startContent={<AlertTriangle className="w-3 h-3" />}
                              >
                                {pattern}
                              </Chip>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* GPS Sample Details */}
                      <div>
                        <span className="text-default-400 text-xs">GPS Sample Details ({(checkIn.samples || []).length} points):</span>
                        <div className="space-y-1 mt-1">
                          {(checkIn.samples || []).map((sample: any, idx: number) => {
                            const prevSample = idx > 0 ? (checkIn.samples || [])[idx - 1] : null;
                            const distance = prevSample ? calculateDistance(
                              prevSample.latitude, prevSample.longitude,
                              sample.latitude, sample.longitude
                            ) : 0;
                            
                            return (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <span className="text-default-500 min-w-16">
                                  Sample {idx + 1}:
                                </span>
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  color={sample.accuracy < 10 ? "success" : sample.accuracy < 20 ? "warning" : "default"}
                                >
                                  ±{sample.accuracy.toFixed(1)}m
                                </Chip>
                                {idx > 0 && (
                                  <Chip
                                    size="sm"
                                    variant="flat"
                                    color={distance > 5 ? "success" : distance > 2 ? "warning" : "danger"}
                                  >
                                    {distance.toFixed(1)}m moved
                                  </Chip>
                                )}
                                <span className="text-default-400 text-xs">
                                  {new Date(sample.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {checkIn.userAgent && (
                        <div className="text-xs text-default-400">
                          <Smartphone className="w-3 h-3 inline mr-1" />
                          {checkIn.userAgent.split(' ')[0]}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
          
          {currentCheckIns.length > 10 && (
            <div className="text-center pt-2">
              <span className="text-sm text-default-400">
                Showing 10 of {currentCheckIns.length} check-ins
              </span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}