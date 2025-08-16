'use client';

import { useEffect, useState } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  Button, 
  Progress, 
  Chip, 
  Divider 
} from '@heroui/react';
import { Target } from 'lucide-react';
import CardMatrixLoader from '@components/profile/CardMatrixLoader';

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
}

export default function CheckInModal({ isOpen, onClose, userEmail, remainingQuota }: CheckInModalProps) {
  const [isCollecting, setIsCollecting] = useState(false);
  const [samples, setSamples] = useState<GPSSample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuota, setCurrentQuota] = useState(remainingQuota);
  const [isSuccess, setIsSuccess] = useState(false);

  const TOTAL_SAMPLES = 5;
  const SAMPLE_INTERVAL = 15000; // 15 seconds between samples
  const TOTAL_DURATION = (TOTAL_SAMPLES - 1) * SAMPLE_INTERVAL; // Total time for collection

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsCollecting(false);
      setSamples([]);
      setError(null);
      setProgress(0);
      setHasPermission(false);
      setIsSubmitting(false);
      setIsSuccess(false);
      setCurrentQuota(remainingQuota);
    }
  }, [isOpen, remainingQuota]);

  const requestPermission = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setError(null);
    setIsCollecting(true);

    // Request initial permission with high accuracy
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHasPermission(true);
        setError(null);
        startCollection();
      },
      (error) => {
        setIsCollecting(false);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            setError('Location permission denied. Please enable location access for this site.');
            break;
          case error.POSITION_UNAVAILABLE:
            setError('Location information unavailable. Please check your device settings.');
            break;
          case error.TIMEOUT:
            setError('Location request timed out. Please try again.');
            break;
          default:
            setError('An unknown error occurred while accessing location.');
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

          // Update progress based on time elapsed
          const elapsed = Date.now() - startTime;
          const progressPercent = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
          setProgress(progressPercent);

          // Check if we've collected enough samples
          if (sampleCount >= TOTAL_SAMPLES) {
            setIsCollecting(false);
            setProgress(100);
            // Clear the interval
            if (intervalId) {
              clearInterval(intervalId);
            }
          }
        },
        (error) => {
          console.error('Error getting position:', error);
          // Continue collecting even if one sample fails
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    // Collect first sample immediately
    collectSample();

    // Set up interval for remaining samples
    const intervalId = setInterval(() => {
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
    };
  };

  const submitCheckIn = async () => {
    if (samples.length === 0) {
      setError('No GPS samples collected');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          samples,
          source: 'Web GPS',
          userAgent: navigator.userAgent
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit check-in');
      }

      const result = await response.json();
      
      // Update quota and show success
      setCurrentQuota(prev => prev - 1);
      setIsSuccess(true);
      
      // Dispatch custom event to refresh profile data
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userUpdated'));
      }
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting check-in:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit check-in');
      setIsSubmitting(false);
    }
  };

  // Auto-submit when collection is complete
  useEffect(() => {
    if (!isCollecting && samples.length === TOTAL_SAMPLES && !isSubmitting && !isSuccess) {
      submitCheckIn();
    }
  }, [isCollecting, samples.length]);

  const handleClose = () => {
    // Reset all state when closing
    setIsCollecting(false);
    setSamples([]);
    setError(null);
    setProgress(0);
    setHasPermission(false);
    setIsSubmitting(false);
    setIsSuccess(false);
    onClose();
  };

  return (
    <Modal
      size="lg"
      placement="center"
      isOpen={isOpen}
      backdrop="blur"
      onClose={handleClose}
      hideCloseButton={isCollecting || isSubmitting}
      isDismissable={!isCollecting && !isSubmitting}
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
              <h1 className="text-xl font-bold">Check-in</h1>
              <Chip size="sm" variant="flat" color="default">
                {currentQuota}/50 <Target className="w-3 h-3 inline ml-1" />
              </Chip>
            </div>
            <p className="text-default-600 text-sm">
              Verify your presence with GPS coordinates
            </p>
          </div>
        </ModalHeader>
        <Divider />
        <ModalBody className="gap-4 py-4">
          {/* Success State */}
          {isSuccess && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-success-50 rounded-lg">
                <p className="text-success font-semibold">
                  Check-in successful!
                </p>
                <p className="text-sm text-default-600 mt-2">
                  Collected {samples.length} GPS samples
                </p>
              </div>
              <p className="text-xs text-default-400">
                Closing automatically...
              </p>
            </div>
          )}

          {/* Initial State */}
          {!hasPermission && !isCollecting && !isSuccess && (
            <div className="text-center space-y-4">
              {currentQuota > 0 ? (
                <>
                  <p className="text-default-600 text-sm">
                    This check-in requires access to your device's precise location.
                  </p>
                  <p className="text-xs text-default-400">
                    We'll collect 5 GPS samples over approximately 1 minute to verify your location.
                  </p>
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
              <CardMatrixLoader text="COLLECTING GPS DATA" height="120px" />
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{samples.length} / {TOTAL_SAMPLES} samples</span>
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
                        <Chip size="sm" variant="flat" color="success">
                          Sample {index + 1}
                        </Chip>
                        <span className="text-default-500">
                          Accuracy: {sample.accuracy.toFixed(1)}m
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
              <CardMatrixLoader text="SUBMITTING CHECK-IN" height="120px" />
              <p className="text-default-600 text-sm">
                Processing your location data...
              </p>
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
          {!isCollecting && !isSubmitting && !isSuccess && (
            <>
              {currentQuota > 0 && !hasPermission && (
                <Button
                  onPress={requestPermission}
                  color="primary"
                  size="md"
                >
                  Start Check-In
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
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}