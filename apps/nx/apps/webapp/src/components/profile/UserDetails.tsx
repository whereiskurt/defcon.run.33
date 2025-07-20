'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Spinner,
} from '@heroui/react';

type UserData = {
  email: string;
  mqtt_usertype?: string;
  // Add other fields from the API response as needed
};

export default function UserDetails() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user');
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
        } else {
          throw new Error('User data not found in response');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <Card className="w-full mx-auto">
        <CardHeader className="flex gap-3">
          <div className="flex flex-col">
            <p className="text-lg">User Details</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="flex justify-center items-center p-4">
            <Spinner size="lg" />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error || !user) {
    return (
      <Card className="w-full mx-auto">
        <CardHeader className="flex gap-3">
          <div className="flex flex-col">
            <p className="text-lg">User Details</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <p className="text-red-500">{error || 'No user data available'}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full mx-auto">
      <CardHeader className="flex gap-3">
        <div className="flex flex-col">
          <p className="text-lg">User Details</p>
          <p className="text-small text-default-500">Your account information</p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-small text-default-500">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-small text-default-500">User Type</p>
            <p className="font-medium">{user.mqtt_usertype || 'Not specified'}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
