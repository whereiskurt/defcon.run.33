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
import { FaStrava } from 'react-icons/fa';
import { FaCheckCircle } from 'react-icons/fa';
import { signIn, useSession } from 'next-auth/react';

export default function StravaConnection() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState<boolean>(false);

  // Handle connecting to Strava
  const handleStravaConnect = async () => {
    setLoading(true);
    await signIn('strava', { callbackUrl: '/profile' });
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
          <p className="text-small text-default-500">Connect your Strava account</p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        {isStravaConnected ? (
          <div className="flex items-center gap-3">
            <FaCheckCircle className="text-green-500 text-xl" />
            <div>
              <p className="font-medium">Connected to Strava</p>
              <p className="text-small text-default-500">
                Your Strava account is linked to your profile
              </p>
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
            : "Connecting to Strava allows us to sync your activities"}
        </p>
      </CardFooter>
    </Card>
  );
}
