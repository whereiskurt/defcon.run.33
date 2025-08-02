'use client';

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  Button,
  Spinner,
} from '@heroui/react';
import { FaStrava, FaSync } from 'react-icons/fa';
import { FaCheckCircle } from 'react-icons/fa';
import { signIn, useSession } from 'next-auth/react';

export default function StravaConnection() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');

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
        if (data.syncType === 'first-time') {
          // First time historical sync
          if (data.newActivities > 0) {
            const accomplishmentText = data.accomplishmentsCreated > 0 ? ` Created ${data.accomplishmentsCreated} accomplishments!` : '';
            setSyncMessage(`✨ First-time sync complete! Found ${data.activitiesCount} DEFCON activities across ${data.yearsScanned.length} years (${data.newActivities} new, ${data.existingActivities} existing).${accomplishmentText} Future syncs will only check current year.`);
          } else {
            setSyncMessage(`✨ First-time sync complete! No activities found across ${data.yearsScanned.length} years. Future syncs will only check current year.`);
          }
        } else {
          // Regular current year sync
          if (data.newActivities > 0) {
            const accomplishmentText = data.accomplishmentsCreated > 0 ? ` Created ${data.accomplishmentsCreated} accomplishments!` : '';
            setSyncMessage(`Successfully synced ${data.activitiesCount} DC32 activities (${data.newActivities} new, ${data.existingActivities} existing).${accomplishmentText}`);
          } else {
            setSyncMessage(`No new DC32 activities found (${data.activitiesCount} existing activities)`);
          }
        }
      } else {
        if (response.status === 429) {
          setSyncMessage(`Rate limit: ${data.message}`);
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
        <CardBody className="flex justify-center items-center p-8">
          <Spinner size="lg" />
        </CardBody>
      </Card>
    );
  }

  // Check if Strava is connected
  const isStravaConnected = session?.user?.hasStrava;

  return (
    <Card className="w-full">
      <CardHeader className="flex gap-3">
        <div className="flex flex-col">
          <p className="text-lg">Strava Connection</p>
          <p className="text-small text-default-500">Connecting allows automatic award of daily activity accomplishments.</p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        {isStravaConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FaCheckCircle className="text-green-500 text-xl" />
              <div>
                <p className="font-medium">Connected to Strava</p>
                <p className="text-small text-default-500">
                  Your Strava account is linked to your profile
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-grow">
                <p className="font-medium mb-1">
                  Sync DEFCON activities
                </p>
                <p className="text-small text-default-500">
                  Sync Strave DEFCON activities (4x daily limit)
                </p>
                {syncMessage && (
                  <p className={`text-small mt-2 ${syncMessage.includes('Error') || syncMessage.includes('Failed') || syncMessage.includes('Rate limit') ? 'text-danger' : 'text-success'}`}>
                    {syncMessage}
                  </p>
                )}
              </div>
              <Button
                color="primary"
                variant="flat"
                startContent={<FaSync size={16} />}
                onClick={handleStravaSync}
                isLoading={syncing}
                size="sm"
              >
                {syncing ? 'Syncing...' : 'Sync Strava'}
              </Button>
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
    </Card>
  );
}
