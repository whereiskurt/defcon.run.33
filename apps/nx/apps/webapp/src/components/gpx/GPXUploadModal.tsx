'use client';

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
  Link,
  RadioGroup,
  Radio,
  Progress
} from '@heroui/react';
import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, ExternalLink, Trophy, Lock, QrCode } from 'lucide-react';
import { useSession } from 'next-auth/react';
import MatrixRainPortal from '../effects/MatrixRainPortal';

interface GPXUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const activityTypes = [
  { key: 'run', label: 'Run' },
  { key: 'walk', label: 'Walk' },
  { key: 'ruck', label: 'Ruck' },
  { key: 'bike', label: 'Bike' },
  { key: 'roll', label: 'Roll' },
  { key: 'swim', label: 'Swim' }
];

const dc33Days = [
  { key: 'day1', label: 'Day 1 (Thursday)' },
  { key: 'day2', label: 'Day 2 (Friday)' },
  { key: 'day3', label: 'Day 3 (Saturday)' },
  { key: 'day4', label: 'Day 4 (Sunday)' }
];

// Generate DEFCON years - 8 years back from DC33 (2025)
const defconYears = Array.from({ length: 8 }, (_, i) => {
  const year = 2025 - i;
  const dcNumber = year - 1992;
  return {
    key: year.toString(),
    label: `DC${dcNumber} (${year})`,
    year: year,
    dcNumber: dcNumber
  };
});

interface Route {
  id: number;
  name: string;
  distance: string;
  description?: string;
  polyline?: string;
  elevationGain?: number;
  difficulty?: string;
  terrain?: string;
  startLocation?: any;
  endLocation?: any;
  stravaUrl?: string;
  gpxUrl?: string;
}

export default function GPXUploadModal({ isOpen, onClose }: GPXUploadModalProps) {
  const { data: session } = useSession();
  const [uploadMethod, setUploadMethod] = useState<'gpx' | 'route'>('route');
  const [file, setFile] = useState<File | null>(null);
  const [activityType, setActivityType] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [defconYear, setDefconYear] = useState<string>('2025'); // Default to DC33
  const [dc33Day, setDc33Day] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasEverSucceeded, setHasEverSucceeded] = useState(false);
  const [error, setError] = useState<string>('');
  const [accomplishmentId, setAccomplishmentId] = useState<string>('');
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [showMatrixEffect, setShowMatrixEffect] = useState(false);
  const [remainingUploads, setRemainingUploads] = useState<Record<string, number>>({});
  const [maxUploadsPerDay, setMaxUploadsPerDay] = useState<number>(2);
  const [accomplishmentCount, setAccomplishmentCount] = useState<number>(0);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);

  // Fetch routes, upload counts, and check social accomplishments when modal opens
  useEffect(() => {
    if (isOpen) {
      if (routes.length === 0) {
        fetchRoutes();
      }
      fetchUploadCounts();
      checkAccomplishments();
    }
  }, [isOpen]);

  // Handle mobile keyboard viewport issues
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      // Force recalculation of viewport height on mobile when keyboard opens/closes
      if (window.innerWidth <= 768) {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const fetchRoutes = async () => {
    try {
      const response = await fetch('/api/routes');
      if (response.ok) {
        const data = await response.json();
        setRoutes(data.routes || []);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const fetchUploadCounts = async () => {
    try {
      const response = await fetch('/api/gpx/upload-counts');
      if (response.ok) {
        const data = await response.json();
        setRemainingUploads(data.remainingUploads || {});
        setMaxUploadsPerDay(data.maxPerDay || 2);
      }
    } catch (error) {
      console.error('Error fetching upload counts:', error);
    }
  };

  const checkAccomplishments = async () => {
    try {
      const response = await fetch('/api/user/accomplishments');
      if (response.ok) {
        const data = await response.json();
        const count = data.accomplishments?.length || 0;
        setAccomplishmentCount(count);
        setHasAccess(count >= 1);
      }
    } catch (error) {
      console.error('Error checking accomplishments:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 30 * 1024) { // 30KB limit
        setError('File size must be less than 30KB');
        return;
      }
      if (!selectedFile.name.toLowerCase().endsWith('.gpx')) {
        setError('Please select a GPX file');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    // Validate based on upload method
    if (uploadMethod === 'gpx') {
      if (!file || !activityType || !defconYear || !dc33Day) {
        setError('Please select a GPX file, activity type, DEFCON year, and day');
        return;
      }
    } else {
      if (!selectedRoute || !activityType || !defconYear || !dc33Day) {
        setError('Please select a route, activity type, DEFCON year, and day');
        return;
      }
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('uploadMethod', uploadMethod);
      if (uploadMethod === 'gpx' && file) {
        formData.append('gpx', file);
      }
      formData.append('activityType', activityType);
      formData.append('description', description);
      formData.append('defconYear', defconYear);
      formData.append('dc33Day', dc33Day);
      formData.append('selectedRoute', selectedRoute);

      const response = await fetch('/api/gpx', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.status === 403) {
        // User doesn't have enough accomplishments
        setAccomplishmentCount(result.accomplishmentCount || 0);
        setHasAccess(false);
        setError(result.message || 'You need at least 1 accomplishment to upload GPX files.');
      } else if (response.ok) {
        setSuccess(true);
        setHasEverSucceeded(true);
        setAccomplishmentId(result.accomplishmentId);
        
        // Trigger Matrix effect
        setShowMatrixEffect(true);
        
        // Trigger leaderboard refresh if it exists on the page
        // This will update the leaderboard in the background while modal stays open
        const refreshEvent = new CustomEvent('refreshLeaderboard');
        window.dispatchEvent(refreshEvent);
        
        // Refresh upload counts to update remaining uploads
        fetchUploadCounts();
        
        // Get user's display name for the leaderboard link
        try {
          const userResponse = await fetch('/api/user');
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserDisplayName(userData.user?.displayname || '');
          }
        } catch (err) {
          console.error('Failed to fetch user data:', err);
        }
        
        // Clear form but keep upload method and GPX file (if used)
        // Don't reset uploadMethod - keep the user's choice
        // Don't reset file if GPX was used
        // Reset selectedRoute since user should pick a different route each time
        setActivityType('');
        setDescription('');
        setDefconYear('2025'); // Reset to default
        setDc33Day('');
        setSelectedRoute(''); // Reset route selection
      } else {
        setError(result.message || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    // Reset all state
    setUploadMethod('route');
    setFile(null);
    setActivityType('');
    setDescription('');
    setDefconYear('2025'); // Reset to default
    setDc33Day('');
    setSelectedRoute('');
    setUploading(false);
    setSuccess(false);
    setHasEverSucceeded(false);
    setError('');
    setAccomplishmentId('');
    setUserDisplayName('');
    setShowMatrixEffect(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <>
      {showMatrixEffect && (
        <MatrixRainPortal
          duration={3000}
          onComplete={() => setShowMatrixEffect(false)}
        />
      )}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="lg"
        placement="top"
        backdrop="blur"
        scrollBehavior="inside"
        classNames={{
          wrapper: "items-start pt-4 pb-4",
          base: "max-h-[95vh] my-0",
          body: "max-h-none"
        }}
      >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h3>Manual Activity Upload</h3>
          <p className="text-sm text-default-500">Upload a GPX file or select an existing route</p>
        </ModalHeader>
        
        <ModalBody className="gap-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !uploading) {
              e.preventDefault();
              if (!success) {
                handleUpload();
              }
            }
          }}
        >
          {!hasAccess && (
            <div className="flex flex-col gap-3 p-4 bg-warning-50 border border-warning-200 rounded-lg">
              <div className="flex items-center gap-2 text-warning-800">
                <Lock className="h-5 w-5" />
                <span className="font-medium">Unlock Required</span>
              </div>
              <p className="text-warning-700 text-sm">
                You need at least 1 accomplishment to upload GPX files.
              </p>
              <Progress 
                value={(accomplishmentCount / 1) * 100} 
                color="warning" 
                className="max-w-md"
                label={`${accomplishmentCount} / 1 accomplishment`}
                showValueLabel
              />
              <div className="flex items-center gap-2 text-sm text-warning-600">
                <QrCode className="h-4 w-4" />
                <span>Unlock this feature with any accomplishment (activities, social, or meshctf)!</span>
              </div>
            </div>
          )}

          {hasEverSucceeded && accomplishmentId && (
            <div className="flex flex-col gap-3 p-4 bg-success-50 border border-success-200 rounded-lg">
              <div className="flex items-center gap-2 text-success-800">
                <Trophy className="h-5 w-5" />
                <span className="font-medium">Accomplishment Added!</span>
              </div>
              <p className="text-success-700 text-sm">
                Your activity has been added to your accomplishments. View your progress on the leaderboard.
              </p>
              <Button
                color="success"
                variant="solid"
                startContent={<ExternalLink className="h-4 w-4" />}
                onPress={() => {
                  const filterParam = userDisplayName ? `?filter=${encodeURIComponent(userDisplayName)}` : '';
                  window.open(`/leaderboard${filterParam}`, '_blank');
                }}
                className="w-full"
              >
                View My Results on Leaderboard
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-danger-600" />
              <p className="text-danger-800">{error}</p>
            </div>
          )}

          <div className="space-y-4" style={{ opacity: hasAccess ? 1 : 0.5, pointerEvents: hasAccess ? 'auto' : 'none' }}>
            <Select
              label="DEFCON Year"
              placeholder="Select DEFCON year"
              selectedKeys={defconYear ? [defconYear] : []}
              onSelectionChange={(keys) => setDefconYear(Array.from(keys)[0] as string)}
              isRequired
              classNames={{
                value: "text-foreground",
                listbox: "text-foreground",
              }}
            >
              {defconYears.map((defcon) => (
                <SelectItem 
                  key={defcon.key}
                  classNames={{
                    base: "text-foreground data-[hover=true]:text-foreground data-[selectable=true]:text-foreground",
                  }}
                >
                  {defcon.label}
                </SelectItem>
              ))}
            </Select>

            <Select
              label={`${defconYears.find(d => d.key === defconYear)?.label || 'DEFCON'} Day`}
              placeholder="Select which day"
              selectedKeys={dc33Day ? [dc33Day] : []}
              onSelectionChange={(keys) => setDc33Day(Array.from(keys)[0] as string)}
              isRequired
              description={
                defconYear && dc33Day
                  ? `${remainingUploads[`${defconYear}_${dc33Day}`] ?? maxUploadsPerDay} of ${maxUploadsPerDay} uploads remaining`
                  : undefined
              }
              classNames={{
                value: "text-foreground",
                listbox: "text-foreground",
              }}
            >
              {dc33Days.map((day) => {
                const uploadKey = `${defconYear}_${day.key}`;
                const remaining = remainingUploads[uploadKey] ?? maxUploadsPerDay;
                return (
                  <SelectItem 
                    key={day.key}
                    endContent={
                      <Chip size="sm" variant="flat" color={remaining > 0 ? "success" : "danger"}>
                        {remaining}/{maxUploadsPerDay} left
                      </Chip>
                    }
                    classNames={{
                      base: "text-foreground data-[hover=true]:text-foreground data-[selectable=true]:text-foreground",
                    }}
                  >
                    {day.label}
                  </SelectItem>
                );
              })}
            </Select>

            <RadioGroup
              label="Upload Method"
              value={uploadMethod}
              onValueChange={(value) => {
                setUploadMethod(value as 'gpx' | 'route');
                // Clear relevant fields when switching methods
                if (value === 'gpx') {
                  setSelectedRoute('');
                } else {
                  setFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }
                setError('');
              }}
              orientation="horizontal"
            >
              <Radio value="route">Select Existing Route</Radio>
              <Radio value="gpx">Upload GPX File</Radio>
            </RadioGroup>

            {uploadMethod === 'gpx' && (
              <div>
                <label className="block text-sm font-medium mb-2">GPX File</label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="bordered"
                    startContent={<Upload className="h-4 w-4" />}
                    onPress={() => fileInputRef.current?.click()}
                  >
                    Select GPX File
                  </Button>
                  {file && (
                    <Chip color="success" variant="flat">
                      {file.name}
                    </Chip>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".gpx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-xs text-default-500 mt-1">Maximum file size: 30KB</p>
              </div>
            )}

            {uploadMethod === 'route' && (
              <Select
                label="Route"
                placeholder="Select a route"
                selectedKeys={selectedRoute ? [selectedRoute] : []}
                onSelectionChange={(keys) => setSelectedRoute(Array.from(keys)[0] as string)}
                isRequired
                classNames={{
                  value: "text-foreground",
                  listbox: "text-foreground",
                  popoverContent: "text-foreground",
                  innerWrapper: "text-foreground",
                  mainWrapper: "text-foreground"
                }}
                listboxProps={{
                  itemClasses: {
                    base: "text-foreground data-[hover=true]:text-foreground data-[selected=true]:text-foreground data-[selectable=true]:text-foreground",
                    title: "text-foreground",
                    description: "text-foreground"
                  }
                }}
              >
                {routes.map((route) => (
                  <SelectItem 
                    key={route.id.toString()}
                    textValue={route.name}
                  >
                    {route.name} ({route.distance})
                  </SelectItem>
                ))}
              </Select>
            )}

            <Select
              label="Activity Type"
              placeholder="Select activity type"
              selectedKeys={activityType ? [activityType] : []}
              onSelectionChange={(keys) => setActivityType(Array.from(keys)[0] as string)}
              isRequired
              classNames={{
                value: "text-foreground",
                listbox: "text-foreground",
              }}
            >
              {activityTypes.map((type) => (
                <SelectItem 
                  key={type.key}
                  classNames={{
                    base: "text-foreground data-[hover=true]:text-foreground data-[selectable=true]:text-foreground",
                  }}
                >
                  {type.label}
                </SelectItem>
              ))}
            </Select>

            <Input
              ref={descriptionRef}
              label="Description (Optional)"
              placeholder="What happens in Vegas..."
              value={description}
              onValueChange={setDescription}
              maxLength={100}
              onFocus={() => {
                // On mobile, scroll the input into view when focused
                if (window.innerWidth <= 768) {
                  setTimeout(() => {
                    descriptionRef.current?.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'center' 
                    });
                  }, 300);
                }
              }}
            />
          </div>

        </ModalBody>

        <ModalFooter>
          <Button 
            color="success"
            variant="bordered"
            onPress={handleUpload}
            isLoading={uploading}
            isDisabled={
              !hasAccess ||
              uploading || 
              !activityType || 
              !defconYear ||
              !dc33Day || 
              (uploadMethod === 'gpx' && !file) ||
              (uploadMethod === 'route' && !selectedRoute) ||
              Boolean(defconYear && dc33Day && remainingUploads[`${defconYear}_${dc33Day}`] === 0)
            }
          >
            {!hasAccess ? 'Unlock Required' :
             uploading ? 'Adding...' : 
             (defconYear && dc33Day && remainingUploads[`${defconYear}_${dc33Day}`] === 0) ? 'Limit Reached' : 
             'Add Another'}
          </Button>
          <Button variant="light" onPress={handleClose}>
            {success ? 'Close' : 'Cancel'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </>
  );
}