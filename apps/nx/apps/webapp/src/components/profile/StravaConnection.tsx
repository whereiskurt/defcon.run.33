'use client';

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  Button,
  Skeleton,
} from '@heroui/react';
import { FaStrava, FaSync } from 'react-icons/fa';
import { FaCheckCircle } from 'react-icons/fa';
import { signIn, useSession } from 'next-auth/react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function StravaConnection() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Handle connecting to Strava
  const handleStravaConnect = async () => {
    setLoading(true);
    await signIn('strava', { callbackUrl: '/profile' });
  };

  // Handle smart Strava sync (historical first time, then current year)
  const handleStravaSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    
    try {
      const response = await fetch('/api/strava/sync-smart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        const quotaText = data.remainingQuota !== undefined ? ` (${data.remainingQuota} syncs remaining)` : '';
        
        if (data.syncType === 'first-time') {
          // First time historical sync
          if (data.newActivities > 0) {
            const accomplishmentText = data.accomplishmentsCreated > 0 ? ` Created ${data.accomplishmentsCreated} accomplishments!` : '';
            setSyncMessage(`✨ First-time sync complete! Found ${data.activitiesCount} DEFCON activities across ${data.yearsScanned.length} years (${data.newActivities} new, ${data.existingActivities} existing).${accomplishmentText} Future syncs will only check current year.${quotaText}`);
          } else {
            setSyncMessage(`✨ First-time sync complete! No activities found across ${data.yearsScanned.length} years. Future syncs will only check current year.${quotaText}`);
          }
        } else {
          // Regular current year sync
          if (data.newActivities > 0) {
            const accomplishmentText = data.accomplishmentsCreated > 0 ? ` Created ${data.accomplishmentsCreated} accomplishments!` : '';
            setSyncMessage(`Successfully synced ${data.activitiesCount} DC32 activities (${data.newActivities} new, ${data.existingActivities} existing).${accomplishmentText}${quotaText}`);
          } else {
            setSyncMessage(`No new DC32 activities found (${data.activitiesCount} existing activities)${quotaText}`);
          }
        }
      } else {
        if (response.status === 429) {
          setSyncMessage(`❌ ${data.message}`);
        } else {
          setSyncMessage(`Error: ${data.message}`);
        }
      }
    } catch (error) {
      console.error('Error syncing Strava activities:', error);
      setSyncMessage('Failed to sync activities');
    } finally {
      setSyncing(false);
      // Clear message after 10 seconds for first-time, 8 seconds for regular
      const clearDelay = syncMessage.includes('First-time') ? 12000 : 8000;
      setTimeout(() => setSyncMessage(''), clearDelay);
    }
  };

  if (status === 'loading') {
    return (
      <Card className="w-full">
        <CardHeader className="flex justify-between items-center pb-2">
          <div className="flex items-center gap-2">
            <FaStrava className="w-5 h-5 text-orange-600" />
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold">Strava Connection</h3>
              <p className="text-sm text-default-500">Automatically contribute to heatmap</p>
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

  // Check if Strava is connected
  const isStravaConnected = session?.user?.hasStrava;

  return (
    <Card className="w-full">
      <CardHeader className="flex justify-between items-center pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <FaStrava className="w-5 h-5 text-orange-600" />
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold">Strava Connection</h3>
            <p className="text-sm text-default-500">Automatically contribute to heatmap</p>
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
        <>
          <CardBody>
        {isStravaConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FaCheckCircle className="text-green-500 text-xl" />
              <div>
                <p className="font-medium">Already Connected</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-center">
                <Button
                  color="primary"
                  variant="flat"
                  startContent={<FaSync size={16} />}
                  onClick={handleStravaSync}
                  isLoading={syncing}
                  size="lg"
                  className="px-8"
                >
                  {syncing ? 'Syncing...' : 'Sync Strava'}
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-small text-default-500">
                  Sync Strava DEFCON activities (4x daily limit)
                </p>
              </div>
              
              {syncMessage && (
                <p className={`text-small text-center ${syncMessage.includes('Error') || syncMessage.includes('Failed') || syncMessage.includes('Rate limit') ? 'text-danger' : 'text-success'}`}>
                  {syncMessage}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-grow">
              <p className="font-medium mb-1">
                Connect your Strava account
              </p>
              <p className="text-small text-default-500">
                Sync your activities and track your progress
              </p>
            </div>
            <Button
              color="danger"
              variant="flat"
              startContent={<FaStrava size={20} />}
              onClick={handleStravaConnect}
              isLoading={loading}
              size="sm"
            >
              Connect with Strava
            </Button>
          </div>
        )}
          </CardBody>
          <Divider />
          <CardFooter>
            <p className="text-small text-default-500">
              {isStravaConnected
                ? "You can disconnect your Strava account from your Strava settings."
                : "You can disconnect your Strava account from your Strava settings."}
            </p>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
