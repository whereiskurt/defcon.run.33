'use client';

import { useEffect, useState } from 'react';
import { usePersistedState } from '../../hooks/usePersistedState';
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Progress,
  Chip,
  Skeleton,
  Button,
} from '@heroui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type QuotaData = {
  qrSheet?: number;
  displaynameChanges?: number;
  stravaSync?: number;
  qrScans?: number;
  flagChecks?: number;
  checkIns?: number;
};

export default function QuotaDisplay() {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = usePersistedState('profile-quota-expanded', false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user');
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        const data = await response.json();
        if (data.user?.quota) {
          setQuota(data.user.quota);
        } else {
          throw new Error('Quota data not found in response');
        }
      } catch (err) {
        console.error('Error fetching quota data:', err);
        setError('Failed to load quota details');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    // Listen for updates
    const handleUpdate = () => {
      fetchUserData();
    };

    window.addEventListener('userUpdated', handleUpdate);
    window.addEventListener('stravaSync', handleUpdate);
    
    return () => {
      window.removeEventListener('userUpdated', handleUpdate);
      window.removeEventListener('stravaSync', handleUpdate);
    };
  }, []);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex justify-between items-center pb-2">
          <div className="flex items-center gap-2">
            <div className="text-2xl">📊</div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold">Usage Quotas</h3>
              <p className="text-sm text-default-500">Your remaining quotas and limits</p>
            </div>
          </div>
          <Button 
            isIconOnly 
            variant="light" 
            size="sm"
            disabled
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </CardHeader>
        <Divider />
      </Card>
    );
  }

  if (error || !quota) {
    return (
      <Card className="w-full">
        <CardHeader className="flex gap-3">
          <div className="flex flex-col">
            <p className="text-lg">Usage Quotas</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <p className="text-red-500">{error || 'No quota data available'}</p>
        </CardBody>
      </Card>
    );
  }

  // Calculate remaining values
  const stravaRemaining = quota.stravaSync ?? 16;  // stravaSync stores remaining count
  const qrScansUsed = quota.qrScans ?? 0;  // qrScans stores used count
  const qrScansRemaining = Math.max(0, 300 - qrScansUsed);
  const qrSheetRemaining = quota.qrSheet ?? 10;  // qrSheet stores remaining count
  const checkInsRemaining = quota.checkIns ?? 50;  // checkIns stores remaining count

  return (
    <Card className="w-full">
      <CardHeader className="flex justify-between items-center pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <div className="text-2xl">📊</div>
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold">Usage Quotas</h3>
            <p className="text-sm text-default-500">Your remaining quotas and limits</p>
          </div>
        </div>
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
      </CardHeader>
      <Divider />
      {isExpanded && (
        <CardBody>
        <div className="space-y-4">
          {/* QR Scans */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">🐰 QR Scans</span>
              <Chip 
                size="sm" 
                color={qrScansRemaining > 50 ? "success" : qrScansRemaining > 0 ? "warning" : "danger"}
                variant="flat"
              >
                {qrScansRemaining} / 300 remaining
              </Chip>
            </div>
            <Progress 
              value={qrScansUsed} 
              maxValue={300}
              color={qrScansRemaining > 50 ? "success" : qrScansRemaining > 0 ? "warning" : "danger"}
              size="sm"
              className="mb-1"
            />
            <p className="text-tiny text-default-500">
              Connect with other rabbits by scanning their QR codes
            </p>
          </div>

          {/* Strava Syncs */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">🏃 Strava Syncs</span>
              <Chip 
                size="sm" 
                color={stravaRemaining > 4 ? "success" : stravaRemaining > 0 ? "warning" : "danger"}
                variant="flat"
              >
                {stravaRemaining} / 16 remaining
              </Chip>
            </div>
            <Progress 
              value={16 - stravaRemaining} 
              maxValue={16}
              color={stravaRemaining > 4 ? "success" : stravaRemaining > 0 ? "warning" : "danger"}
              size="sm"
              className="mb-1"
            />
            <p className="text-tiny text-default-500">
              Sync your DEFCON activities from Strava
            </p>
          </div>

          {/* QR Sheet Generation */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">📄 QR Sheet Generation</span>
              <Chip 
                size="sm" 
                color={qrSheetRemaining > 3 ? "success" : qrSheetRemaining > 0 ? "warning" : "danger"}
                variant="flat"
              >
                {qrSheetRemaining} / 10 remaining
              </Chip>
            </div>
            <Progress 
              value={10 - qrSheetRemaining} 
              maxValue={10}
              color={qrSheetRemaining > 3 ? "success" : qrSheetRemaining > 0 ? "warning" : "danger"}
              size="sm"
              className="mb-1"
            />
            <p className="text-tiny text-default-500">
              Generate QR code sheets for flag distribution
            </p>
          </div>

          {/* Location Check-Ins */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">📍 Location Check-Ins</span>
              <Chip 
                size="sm" 
                color={checkInsRemaining > 10 ? "success" : checkInsRemaining > 0 ? "warning" : "danger"}
                variant="flat"
              >
                {checkInsRemaining} / 50 remaining
              </Chip>
            </div>
            <Progress 
              value={50 - checkInsRemaining} 
              maxValue={50}
              color={checkInsRemaining > 10 ? "success" : checkInsRemaining > 0 ? "warning" : "danger"}
              size="sm"
              className="mb-1"
            />
            <p className="text-tiny text-default-500">
              Verify your presence with GPS coordinates
            </p>
          </div>
        </div>
        </CardBody>
      )}
    </Card>
  );
}