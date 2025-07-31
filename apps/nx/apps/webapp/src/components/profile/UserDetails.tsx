'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Spinner,
  Input,
  Button,
} from '@heroui/react';

type UserData = {
  email: string;
  displayname?: string;
  mqtt_usertype?: string;
  // Add other fields from the API response as needed
};

export default function UserDetails() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Displayname editing state
  const [displaynameInput, setDisplaynameInput] = useState('');
  const [isUpdatingDisplayname, setIsUpdatingDisplayname] = useState(false);
  const [displaynameError, setDisplaynameError] = useState('');
  const [displaynameSuccess, setDisplaynameSuccess] = useState('');

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
          setDisplaynameInput(data.user.displayname || '');
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

  const updateDisplaynameHandler = async () => {
    if (!displaynameInput.trim()) {
      setDisplaynameError('Display name cannot be empty');
      return;
    }

    if (displaynameInput.trim() === user?.displayname) {
      setDisplaynameError('Display name is the same as current');
      return;
    }

    setIsUpdatingDisplayname(true);
    setDisplaynameError('');
    setDisplaynameSuccess('');

    try {
      const response = await fetch('/api/user/displayname', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayname: displaynameInput.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update display name');
      }

      setUser(data.user);
      setDisplaynameSuccess('Display name updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setDisplaynameSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating display name:', err);
      setDisplaynameError(
        err instanceof Error ? err.message : 'Failed to update display name'
      );
    } finally {
      setIsUpdatingDisplayname(false);
    }
  };

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
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        <div className="space-y-6">
          {/* Other User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Display Name Section */}
            <div>
              <p className="text-small text-default-500 mb-2">Display Name</p>
              <div className="flex gap-2 items-start">
                <Input
                  value={displaynameInput}
                  onChange={(e) => {
                    setDisplaynameInput(e.target.value);
                    setDisplaynameError('');
                    setDisplaynameSuccess('');
                  }}
                  placeholder="Enter display name"
                  className="flex-grow"
                  variant="bordered"
                  maxLength={50}
                  disabled={isUpdatingDisplayname}
                />
                <Button
                  onPress={updateDisplaynameHandler}
                  isLoading={isUpdatingDisplayname}
                  color="primary"
                  variant="flat"
                  disabled={
                    !displaynameInput.trim() ||
                    displaynameInput.trim() === user?.displayname
                  }
                >
                  Update
                </Button>
              </div>
              {displaynameError && (
                <p className="text-red-500 text-small mt-1">
                  {displaynameError}
                </p>
              )}
              {displaynameSuccess && (
                <p className="text-green-500 text-small mt-1">
                  {displaynameSuccess}
                </p>
              )}
              <p className="text-small text-default-500 pt-4">Email</p>
              <p className="font-medium">{user.email}</p>
              <p className="text-small text-default-500">User Type</p>
              <p className="font-medium">
                {user.mqtt_usertype || 'Not specified'}
              </p>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
