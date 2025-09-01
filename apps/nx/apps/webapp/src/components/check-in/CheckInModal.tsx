'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  Button, 
  Progress, 
  Chip, 
  Divider,
  Spinner,
  Link,
  Checkbox,
  Input,
  Select,
  SelectItem,
  InputOtp
} from '@heroui/react';
import { Target, Satellite, MapPin, Navigation, RotateCw, Lock, Globe, Flag, KeyRound, Circle, Map } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import the map component to avoid SSR issues
const ManualLocationMap = dynamic(() => import('./ManualLocationMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-default-100 rounded-lg flex items-center justify-center">
      <Spinner size="lg" color="primary" />
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

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  remainingQuota: number;
  userPreference?: 'public' | 'private';
}

export default function CheckInModal({ isOpen, onClose, userEmail, remainingQuota, userPreference }: CheckInModalProps) {
  const [isCollecting, setIsCollecting] = useState(false);
  const [samples, setSamples] = useState<GPSSample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuota, setCurrentQuota] = useState(remainingQuota);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [checkInType, setCheckInType] = useState<'Basic' | 'OTP' | 'With Flag' | 'Manual'>('Basic');
  const [otpCode, setOtpCode] = useState('');
  const [flagText, setFlagText] = useState('');
  const [manualCoordinates, setManualCoordinates] = useState<{latitude: number, longitude: number} | null>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);

  // Dynamic sample settings based on check-in type
  const TOTAL_SAMPLES = checkInType === 'Basic' ? 3 : 5;
  const SAMPLE_INTERVAL = checkInType === 'Basic' ? 1000 : 3000; // 1 second for Basic, 3 seconds for others
  const TOTAL_DURATION = (TOTAL_SAMPLES - 1) * SAMPLE_INTERVAL; // Total time for collection

  // Reset to user preference when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsPrivate(userPreference === 'private');
    }
  }, [isOpen, userPreference]);

  // Auto-focus start button when OTP is complete
  useEffect(() => {
    if (checkInType === 'OTP' && otpCode.length === 6 && startButtonRef.current) {
      startButtonRef.current.focus();
    }
  }, [checkInType, otpCode]);

  // Handle privacy setting changes
  const handlePrivacyChange = (newIsPrivate: boolean) => {
    setIsPrivate(newIsPrivate);
  };

  // Initialize quota when modal opens fresh (not after success)
  useEffect(() => {
    if (isOpen && !isCollecting && !isSubmitting && !isSuccess && samples.length === 0) {
      setCurrentQuota(remainingQuota);
    }
  }, [isOpen, remainingQuota]);

  const requestPermission = async () => {
    // Validate required fields BEFORE GPS collection
    if (checkInType === 'OTP' && (!otpCode || otpCode.length !== 6)) {
      setError('Please enter a valid 6-digit OTP code');
      return;
    }

    if (checkInType === 'With Flag' && (!flagText || flagText.trim().length === 0)) {
      setError('Please enter flag text');
      return;
    }

    if (checkInType === 'Manual') {
      if (!manualCoordinates) {
        setError('Please select a location on the map');
        return;
      }
      // For manual check-in, skip GPS and submit directly
      const manualSample: GPSSample = {
        latitude: manualCoordinates.latitude,
        longitude: manualCoordinates.longitude,
        accuracy: 10, // Set a reasonable accuracy for manual selection
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: Date.now()
      };
      setSamples([manualSample]);
      setIsCollecting(false);
      // Submit will be triggered by useEffect watching samples
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setError(null);
    setIsCollecting(true);

    // Request initial permission with high accuracy
    navigator.geolocation.getCurrentPosition(
      () => {
        setHasPermission(true);
        setError(null);
        startCollection();
      },
      (positionError) => {
        setIsCollecting(false);
        console.warn('Geolocation error:', positionError.message || 'Unknown error');
        
        switch(positionError.code) {
          case positionError.PERMISSION_DENIED:
            setError('Location permission denied. Please enable location access for this site.');
            break;
          case positionError.POSITION_UNAVAILABLE:
            setError('Location information unavailable. Please check your device settings.');
            break;
          case positionError.TIMEOUT:
            setError('Location request timed out. Please try again.');
            break;
          default:
            setError(`Location error: ${positionError.message || 'Unable to access GPS'}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const startCollection = () => {
    setSamples([]);
    setProgress(0);
    let sampleCount = 0;
    const startTime = Date.now();
    let timeoutId: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;

    // Set a maximum timeout for collection
    const maxCollectionTime = TOTAL_DURATION + 10000; // Add 10 seconds buffer
    timeoutId = setTimeout(() => {
      if (sampleCount < TOTAL_SAMPLES) {
        setIsCollecting(false);
        setError(`GPS collection timed out. Only collected ${sampleCount} of ${TOTAL_SAMPLES} samples. Please try again.`);
        setSamples([]);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    }, maxCollectionTime);

    // Function to collect a sample
    const collectSample = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const sample: GPSSample = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          };

          setSamples(prev => [...prev, sample]);
          sampleCount++;
          
          console.log(`GPS sample ${sampleCount}/${TOTAL_SAMPLES} collected:`, sample);

          // Update progress based on samples collected
          const progressPercent = Math.min((sampleCount / TOTAL_SAMPLES) * 100, 100);
          setProgress(progressPercent);

          // Check if we've collected enough samples
          if (sampleCount >= TOTAL_SAMPLES) {
            setIsCollecting(false);
            setProgress(100);
            // Clear the interval and timeout
            if (intervalId) {
              clearInterval(intervalId);
            }
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            console.log(`GPS collection complete: ${sampleCount} samples collected`);
          }
        },
        (positionError) => {
          console.warn('Error getting position sample:', positionError.message || 'Unknown error', positionError);
          // Continue collecting even if one sample fails, but make it more forgiving
        },
        {
          enableHighAccuracy: false, // Less strict for better compatibility
          timeout: 15000, // Longer timeout per sample
          maximumAge: 5000 // Allow slightly cached positions
        }
      );
    };

    // Collect first sample immediately
    console.log(`Starting GPS collection: ${TOTAL_SAMPLES} samples needed`);
    collectSample();

    // Set up interval for remaining samples
    intervalId = setInterval(() => {
      if (sampleCount < TOTAL_SAMPLES) {
        collectSample();
      } else {
        clearInterval(intervalId);
      }
    }, SAMPLE_INTERVAL);

    // Clean up on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  };

  const submitCheckIn = async () => {
    if (samples.length === 0) {
      setError('No GPS samples collected. Please try again.');
      setIsSubmitting(false);
      setIsCollecting(false);
      return;
    }
    
    // Check if we have minimum required samples for non-manual types
    if (checkInType !== 'Manual' && samples.length < TOTAL_SAMPLES) {
      setError(`Only collected ${samples.length} of ${TOTAL_SAMPLES} required GPS samples. Please try again.`);
      setIsSubmitting(false);
      setIsCollecting(false);
      setSamples([]);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setIsSuccess(false); // Ensure we're not in success state while submitting

    try {
      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          samples,
          source: 'Web GPS',
          userAgent: navigator.userAgent,
          isPrivate,
          checkInType,
          otpCode: checkInType === 'OTP' ? otpCode : undefined,
          flagText: checkInType === 'With Flag' ? flagText : undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit check-in');
      }

      await response.json();
      
      // Update quota 
      setCurrentQuota(prev => prev - 1);
      setIsSubmitting(false);
      
      if (checkInType === 'Manual') {
        // For Manual: Reset to clean Manual form instead of showing success
        setSamples([]);
        setProgress(0);
        setHasPermission(false);
        setError(null);
        setCheckInType('Manual');
        setManualCoordinates(null);
        setOtpCode('');
        setFlagText('');
        // Keep privacy setting
        console.log('Manual check-in successful! Reset to Manual form');
      } else {
        // For other types: Show success dialog
        setIsSuccess(true);
        console.log('Check-in successful! Showing success dialog');
      }
      
      // Dispatch custom event to refresh profile data
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userUpdated'));
        window.dispatchEvent(new CustomEvent('checkInUpdated'));
      }
    } catch (error) {
      console.error('Error submitting check-in:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit check-in');
      setIsSubmitting(false);
    }
  };

  // Auto-submit when collection is complete
  useEffect(() => {
    if (checkInType === 'Manual') {
      // For manual, submit as soon as we have 1 sample
      if (samples.length === 1 && !isSubmitting && !isSuccess && !error) {
        submitCheckIn();
      }
    } else {
      // For other types, wait for all samples
      if (!isCollecting && samples.length === TOTAL_SAMPLES && !isSubmitting && !isSuccess && !error) {
        submitCheckIn();
      }
    }
  }, [isCollecting, samples.length, isSubmitting, isSuccess, error, checkInType]);

  const handleClose = () => {
    // Reset all state when closing
    setIsCollecting(false);
    setSamples([]);
    setError(null);
    setProgress(0);
    setHasPermission(false);
    setIsSubmitting(false);
    setIsSuccess(false);
    setCheckInType('Basic');
    setOtpCode('');
    setFlagText('');
    setManualCoordinates(null);
    // Privacy will be reset to user preference when modal opens again
    onClose();
  };

  return (
    <Modal
      size="lg"
      placement="center"
      isOpen={isOpen}
      backdrop="blur"
      onClose={() => {}}  // Prevent closing except via Cancel button
      hideCloseButton={true}  // Always hide the X button
      isDismissable={false}  // Prevent dismissal by clicking outside or pressing Escape
      scrollBehavior="inside"
      classNames={{
        wrapper: "z-[999]",
        backdrop: "z-[998]",
        base: "z-[1000]"
      }}
    >
      <ModalContent>
        <ModalHeader className="text-center">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-xl font-bold flex items-center gap-2">
                {isPrivate ? (
                  <>
                    <Lock className="w-5 h-5 text-warning" />
                    <span>Private CheckIn</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-5 h-5 text-success" />
                    <span>Public CheckIn</span>
                  </>
                )}
              </h1>
              <Chip size="sm" variant="flat" color="default">
                {currentQuota}/50 <Target className="w-3 h-3 inline ml-1" />
              </Chip>
            </div>
            {checkInType !== 'Manual' && (
              <p className="text-default-600 text-sm">
                Requires access to device location.
              </p>
            )}
          </div>
        </ModalHeader>
        <Divider />
        <ModalBody className="gap-2 py-3">
          {/* Success State */}
          {isSuccess && (
            <div className="text-center space-y-4">
              <div className={`p-4 ${isPrivate ? 'bg-warning-50' : 'bg-success-50'} rounded-lg`}>
                <p className={`${isPrivate ? 'text-warning' : 'text-success'} font-semibold text-lg`}>
                  ✅ {isPrivate ? 'Private' : 'Public'} CheckIn successful!
                </p>
                <p className="text-sm text-default-600 mt-2">
                  Collected {samples.length} GPS samples
                  {checkInType === 'OTP' && ` • OTP: ${otpCode}`}
                  {checkInType === 'With Flag' && ` • Flag: "${flagText}"`}
                </p>
                <p className="text-xs text-default-500 mt-1">
                  Remaining quota: {currentQuota}/50
                </p>
                <Link 
                  href="/profile" 
                  size="sm"
                  className="mt-3 inline-flex items-center"
                  showAnchorIcon
                  onPress={handleClose}
                >
                  Check-in History
                </Link>
              </div>
            </div>
          )}

          {/* Initial State */}
          {!hasPermission && !isCollecting && !isSuccess && (
            <div className="text-center space-y-4">
              {currentQuota > 0 ? (
                <>
                  {/* Privacy Selection - First */}
                  <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handlePrivacyChange(false)}
                        className={`flex-1 max-w-[140px] px-3 py-1 rounded-lg border-2 transition-all ${
                          !isPrivate 
                            ? 'border-success bg-success-50 dark:bg-success-50/10' 
                            : 'border-default-200 bg-content1 hover:bg-content2'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Globe className={`w-4 h-4 ${!isPrivate ? 'text-success' : 'text-default-400'}`} />
                          <div className={`text-xs font-semibold ${!isPrivate ? 'text-success' : 'text-default-600'}`}>
                            Public
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => handlePrivacyChange(true)}
                        className={`flex-1 max-w-[140px] px-3 py-1 rounded-lg border-2 transition-all ${
                          isPrivate 
                            ? 'border-warning bg-warning-50 dark:bg-warning-50/10' 
                            : 'border-default-200 bg-content1 hover:bg-content2'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Lock className={`w-4 h-4 ${isPrivate ? 'text-warning' : 'text-default-400'}`} />
                          <div className={`text-xs font-semibold ${isPrivate ? 'text-warning' : 'text-default-600'}`}>
                            Private
                          </div>
                        </div>
                      </button>
                  </div>

                  {/* Check-in Type Selection - Dropdown Style with Matching Width */}
                  <div className="flex justify-center">
                    <div className="w-[288px]">
                      <Select
                        label="Check-in Type"
                        placeholder="Select type"
                        selectedKeys={[checkInType]}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as 'Basic' | 'OTP' | 'With Flag' | 'Manual';
                          setCheckInType(selected);
                          // Clear manual coordinates when switching away from Manual
                          if (selected !== 'Manual') {
                            setManualCoordinates(null);
                          }
                        }}
                        size="sm"
                        variant="bordered"
                        startContent={
                          checkInType === 'Basic' ? <Circle className="w-4 h-4 text-primary" /> :
                          checkInType === 'OTP' ? <KeyRound className="w-4 h-4 text-secondary" /> :
                          checkInType === 'Manual' ? <Map className="w-4 h-4 text-warning" /> :
                          <Flag className="w-4 h-4 text-success" />
                        }
                      >
                        <SelectItem key="Basic" startContent={<Circle className="w-4 h-4 text-primary" />}>
                          Basic
                        </SelectItem>
                        <SelectItem key="OTP" startContent={<KeyRound className="w-4 h-4 text-secondary" />}>
                          OTP
                        </SelectItem>
                        <SelectItem key="With Flag" startContent={<Flag className="w-4 h-4 text-success" />}>
                          With Flag
                        </SelectItem>
                        <SelectItem key="Manual" startContent={<Map className="w-4 h-4 text-warning" />}>
                          Manual
                        </SelectItem>
                      </Select>
                    </div>
                  </div>

                  {/* Conditional input fields based on check-in type */}
                  {checkInType === 'OTP' && (
                    <div className="flex flex-col items-center space-y-1">
                      <InputOtp
                        value={otpCode}
                        onValueChange={setOtpCode}
                        length={6}
                        placeholder="XXXXXX"
                        description="Enter 6-digit OTP code"
                        size="sm"
                      />
                    </div>
                  )}

                  {checkInType === 'With Flag' && (
                    <div className="flex justify-center">
                      <div className="w-[288px]">
                        <Input
                          label="Flag Text"
                          placeholder="Enter flag text (max 20 chars)"
                          value={flagText}
                          onValueChange={(value) => setFlagText(value.slice(0, 20))}
                          maxLength={20}
                          size="sm"
                          startContent={<Flag className="w-4 h-4 text-default-400" />}
                          description={`${flagText.length}/20 characters`}
                        />
                      </div>
                    </div>
                  )}

                  {checkInType === 'Manual' && (
                    <div className="space-y-2">
                      <ManualLocationMap
                        onLocationSelect={setManualCoordinates}
                        initialCoords={manualCoordinates || undefined}
                      />
                    </div>
                  )}
                  
                  {checkInType !== 'Manual' && (
                    <p className="text-xs text-default-400">
                      {checkInType === 'Basic' 
                        ? "We'll collect 3 samples over 2 seconds."
                        : "We'll collect 5 samples over approximately 12 seconds."}
                    </p>
                  )}
                </>
              ) : (
                <div className="p-4 bg-danger-50 rounded-lg">
                  <p className="text-danger font-semibold">Check-In Quota Exceeded</p>
                  <p className="text-sm text-default-600 mt-2">
                    You have reached the maximum number of check-ins allowed (50).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Collecting State */}
          {isCollecting && !isSuccess && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-3 py-4">
                <div className="relative">
                  <Satellite className="w-16 h-16 text-primary animate-pulse" />
                  <div className="absolute -top-2 -right-2">
                    <Spinner size="sm" color="success" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">Acquiring GPS Signal</p>
                  <p className="text-xs text-default-500">
                    {checkInType === 'Basic' 
                      ? 'Quick collection (2 seconds)...'
                      : checkInType === 'Manual'
                      ? 'Processing manual location...'
                      : 'Collecting location samples...'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.max(1, samples.length)} / {TOTAL_SAMPLES} samples</span>
                </div>
                <Progress 
                  value={progress} 
                  color="primary"
                  className="w-full"
                />
                <p className="text-xs text-default-400 text-center">
                  Please keep this window open during collection
                </p>
              </div>

              {samples.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Collected Samples:</h3>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {samples.map((sample, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3 h-3 text-success" />
                        <Chip size="sm" variant="flat" color="success">
                          Sample {index + 1}
                        </Chip>
                        <span className="text-default-500">
                          ±{sample.accuracy.toFixed(1)}m
                        </span>
                        <span className="text-default-400">
                          {new Date(sample.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submitting State */}
          {isSubmitting && !isSuccess && (
            <div className="text-center space-y-4">
              <div className="flex flex-col items-center justify-center space-y-3 py-4">
                <div className="relative">
                  <Navigation className="w-16 h-16 text-success animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">Submitting Check-In</p>
                  <p className="text-xs text-default-500">Processing your location data...</p>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isSuccess && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-danger-50 rounded-lg">
                <p className="text-danger text-sm">{error}</p>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex justify-center gap-3">
          {(() => {
            // Success state - show Check-in Again and Close buttons
            if (isSuccess) {
              return (
                <>
                  {currentQuota > 0 && (
                    <Button
                      onPress={() => {
                        setIsSuccess(false);
                        setSamples([]);
                        setProgress(0);
                        setHasPermission(false);
                        setError(null);
                        setCheckInType('Manual');
                        setManualCoordinates(null);
                        setOtpCode('');
                        setFlagText('');
                        // Keep the same privacy setting for next check-in
                        // Return to modal form instead of starting immediately
                      }}
                      color={isPrivate ? "warning" : "success"}
                      size="md"
                      startContent={
                        <div className="flex items-center gap-1">
                          {isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                          <RotateCw className="w-4 h-4" />
                        </div>
                      }
                    >
                      {isPrivate ? "Private CheckIn Again" : "Public CheckIn Again"}
                    </Button>
                  )}
                  <Button
                    onPress={handleClose}
                    variant="flat"
                    size="md"
                  >
                    Close
                  </Button>
                </>
              );
            }
            
            // Collecting or submitting - no buttons
            if (isCollecting || isSubmitting) {
              return null;
            }
            
            // Initial/Error state buttons
            return (
              <>
                {currentQuota > 0 && !hasPermission && !error && (
                  <Button
                    ref={startButtonRef}
                    onPress={requestPermission}
                    color={isPrivate ? "warning" : "success"}
                    size="md"
                    isDisabled={checkInType === 'Manual' && !manualCoordinates}
                    startContent={isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  >
                    Submit
                  </Button>
                )}
                {error && (
                  <Button
                    onPress={requestPermission}
                    color="primary"
                    size="md"
                  >
                    Try Again
                  </Button>
                )}
                <Button
                  onPress={handleClose}
                  variant="flat"
                  size="md"
                >
                  {currentQuota <= 0 ? 'Close' : 'Cancel'}
                </Button>
              </>
            );
          })()}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}