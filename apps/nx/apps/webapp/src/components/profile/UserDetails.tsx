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
  Select,
  SelectItem,
} from '@heroui/react';

type UserData = {
  email: string;
  displayname?: string;
  mqtt_usertype?: string;
  // Add other fields from the API response as needed
};

type CtfOption = {
  id: string;
  name: string;
  description?: string;
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

  // Flag submission state
  const [ctfOptions, setCtfOptions] = useState<CtfOption[]>([]);
  const [selectedCtf, setSelectedCtf] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [flagValue, setFlagValue] = useState('');
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);
  const [flagSubmissionError, setFlagSubmissionError] = useState('');
  const [flagSubmissionSuccess, setFlagSubmissionSuccess] = useState('');

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

    const fetchCtfOptions = async () => {
      // TODO: Replace with actual Strapi query
      // This is a stub for CTF options from Strapi
      const stubCtfOptions: CtfOption[] = [
        { id: 'meshctf-1', name: 'MeshCTF Challenge 1', description: 'Basic mesh networking' },
        { id: 'meshctf-2', name: 'MeshCTF Challenge 2', description: 'Advanced protocols' },
        { id: 'meshctf-3', name: 'MeshCTF Challenge 3', description: 'Security analysis' },
      ];
      setCtfOptions(stubCtfOptions);
    };

    fetchUserData();
    fetchCtfOptions();
  }, []);

  const submitFlagHandler = async () => {
    // Validate inputs
    if (!selectedCtf) {
      setFlagSubmissionError('Please select a CTF challenge');
      return;
    }

    if (!otpCode || otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      setFlagSubmissionError('OTP code must be exactly 6 digits');
      return;
    }

    if (!flagValue.trim()) {
      setFlagSubmissionError('Flag cannot be empty');
      return;
    }

    setIsSubmittingFlag(true);
    setFlagSubmissionError('');
    setFlagSubmissionSuccess('');

    try {
      const response = await fetch('/api/accomplishments/flag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ctfId: selectedCtf,
          otpCode: otpCode,
          flag: flagValue.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit flag');
      }

      // Clear form on success
      setSelectedCtf('');
      setOtpCode('');
      setFlagValue('');
      setFlagSubmissionSuccess('Flag submitted successfully! Accomplishment recorded.');
      
      // Clear success message after 5 seconds
      setTimeout(() => setFlagSubmissionSuccess(''), 5000);
    } catch (err) {
      console.error('Error submitting flag:', err);
      setFlagSubmissionError(err instanceof Error ? err.message : 'Failed to submit flag');
    } finally {
      setIsSubmittingFlag(false);
    }
  };

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
      setDisplaynameError(err instanceof Error ? err.message : 'Failed to update display name');
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
          <p className="text-small text-default-500">Your account information</p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        <div className="space-y-6">
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
                disabled={!displaynameInput.trim() || displaynameInput.trim() === user?.displayname}
              >
                Update
              </Button>
            </div>
            {displaynameError && (
              <p className="text-red-500 text-small mt-1">{displaynameError}</p>
            )}
            {displaynameSuccess && (
              <p className="text-green-500 text-small mt-1">{displaynameSuccess}</p>
            )}
          </div>

          {/* Flag Submission Section */}
          <div>
            <p className="text-small text-default-500 mb-2">Submit Flag</p>
            <div className="space-y-4">
              {/* CTF Selection */}
              <Select
                label="Select CTF Challenge"
                placeholder="Choose a challenge"
                selectedKeys={selectedCtf ? [selectedCtf] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
                  setSelectedCtf(selected || '');
                  setFlagSubmissionError('');
                  setFlagSubmissionSuccess('');
                }}
                variant="bordered"
                disabled={isSubmittingFlag}
              >
                {ctfOptions.map((option) => (
                  <SelectItem key={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </Select>

              {/* OTP Code Input */}
              <Input
                label="OTP Code"
                placeholder="Enter 6-digit code"
                value={otpCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(value);
                  setFlagSubmissionError('');
                  setFlagSubmissionSuccess('');
                }}
                variant="bordered"
                maxLength={6}
                disabled={isSubmittingFlag}
              />

              {/* Flag Input */}
              <Input
                label="Flag"
                placeholder="Enter flag"
                value={flagValue}
                onChange={(e) => {
                  setFlagValue(e.target.value);
                  setFlagSubmissionError('');
                  setFlagSubmissionSuccess('');
                }}
                variant="bordered"
                disabled={isSubmittingFlag}
              />

              {/* Submit Button */}
              <Button
                onPress={submitFlagHandler}
                isLoading={isSubmittingFlag}
                color="success"
                variant="flat"
                disabled={!selectedCtf || !otpCode || otpCode.length !== 6 || !flagValue.trim()}
                className="w-full"
              >
                Submit Flag
              </Button>

              {/* Error/Success Messages */}
              {flagSubmissionError && (
                <p className="text-red-500 text-small">{flagSubmissionError}</p>
              )}
              {flagSubmissionSuccess && (
                <p className="text-green-500 text-small">{flagSubmissionSuccess}</p>
              )}
            </div>
          </div>

          {/* Other User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-small text-default-500">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-small text-default-500">User Type</p>
              <p className="font-medium">{user.mqtt_usertype || 'Not specified'}</p>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
