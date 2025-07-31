'use client';

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  Button,
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
      <Card className="max-w-sm mx-auto">
        <CardHeader className="flex gap-3">
          <div className="flex flex-col">
            <p className="text-lg">Strava Connection</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="flex justify-center items-center p-4">
            <div className="animate-pulse h-6 w-32 bg-gray-300 rounded"></div>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Check if Strava is connected
  const isStravaConnected = session?.user?.hasStrava;

  return (
    <Card className="max-w-sm mx-auto">
      <CardHeader className="flex gap-3">
        <div className="flex flex-col">
          <p className="text-lg">Strava Connection</p>
          <p className="text-small text-default-500">Connect your Strava account</p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        {isStravaConnected ? (
          <div className="flex items-center gap-3 p-4">
            <FaCheckCircle className="text-green-500 text-2xl" />
            <div>
              <p className="font-medium">Connected to Strava</p>
              <p className="text-small text-default-500">
                Your Strava account is linked to your profile
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-4">
            <p className="text-center">
              Connect your Strava account
            </p>
            <Button
              color="danger"
              variant="flat"
              startContent={<FaStrava size={24} />}
              onClick={handleStravaConnect}
              isLoading={loading}
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
