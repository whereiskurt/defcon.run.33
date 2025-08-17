'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Input,
  Button,
  Chip,
  Skeleton,
} from '@heroui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type UserData = {
  email: string;
  displayname?: string;
  mqtt_usertype?: string;
  totalPoints?: number;
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
  const [hasDisplaynameChanged, setHasDisplaynameChanged] = useState(false);

  // Email display state
  const [showFullEmail, setShowFullEmail] = useState(false);
  
  // Collapse/expand state
  const [isExpanded, setIsExpanded] = useState(false);


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
          setHasDisplaynameChanged(false);
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
    if ((user?.totalPoints || 0) < 2) {
      setDisplaynameError('You need at least 2 points to change your display name');
      return;
    }

    if (!displaynameInput.trim()) {
      setDisplaynameError('Display name cannot be empty');
      return;
    }

    if (displaynameInput.trim().length > 16) {
      setDisplaynameError('Display name must be 16 characters or less');
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
      setHasDisplaynameChanged(false);

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('displaynameUpdated', { 
        detail: { newDisplayname: data.user.displayname } 
      }));

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
        <CardHeader className="flex justify-between items-center pb-2">
          <div className="flex items-center gap-2">
            <div className="text-2xl">🐰</div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold">User Details</h3>
              <p className="text-sm text-default-500">Your account information</p>
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
      <CardHeader className="flex justify-between items-center pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <div className="text-2xl">🐰</div>
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold">User Details</h3>
            <p className="text-sm text-default-500">Display name, email, and account info</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Display Name Section - 50% */}
          <div>
            <div className="flex flex-col gap-2">
              <Input
                value={displaynameInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setDisplaynameInput(value);
                  setDisplaynameError('');
                  setDisplaynameSuccess('');
                  
                  // Check if value has changed from original
                  setHasDisplaynameChanged(value.trim() !== (user?.displayname || '').trim());
                  
                  // Real-time validation feedback
                  if (value.trim().length > 16) {
                    setDisplaynameError('Display name must be 16 characters or less');
                  }
                }}
                placeholder="Enter display name"
                variant="bordered"
                maxLength={16}
                disabled={isUpdatingDisplayname || (user?.totalPoints || 0) < 2}
                isReadOnly={(user?.totalPoints || 0) < 2}
                size="lg"
                classNames={{
                  input: `text-lg ${(user?.totalPoints || 0) < 2 ? 'text-default-400' : ''}`,
                  inputWrapper: (user?.totalPoints || 0) < 2 ? 'opacity-60' : ''
                }}
              />
              {/* Character counter - only show when unlocked */}
              {(user?.totalPoints || 0) >= 2 && (
                <div className="flex justify-between items-center">
                  <span className="text-tiny text-default-400">
                    {displaynameInput.length}/16 characters
                  </span>
                  {displaynameInput.length > 12 && displaynameInput.length <= 16 && (
                    <span className="text-tiny text-warning">
                      {16 - displaynameInput.length} characters remaining
                    </span>
                  )}
                </div>
              )}
              {(user?.totalPoints || 0) < 2 ? (
                <div className="text-small text-default-500 text-center">
                  🔐 Locked.
                  <Chip
                    color="warning"
                    variant="flat"
                    size="sm"
                    className="inline-flex mr-1"
                  >
                    2x 🥕
                  </Chip>
                  needed
                </div>
              ) : (
                <div className="flex justify-center w-full">
                  <Button
                    onPress={updateDisplaynameHandler}
                    isLoading={isUpdatingDisplayname}
                    color="primary"
                    variant="flat"
                    size="lg"
                    className="px-8"
                    disabled={
                      !displaynameInput.trim() ||
                      !hasDisplaynameChanged ||
                      displaynameInput.trim().length > 16
                    }
                  >
                    Save Display Name
                  </Button>
                </div>
              )}
              {displaynameError && (
                <p className="text-red-500 text-small">
                  {displaynameError}
                </p>
              )}
              {displaynameSuccess && (
                <p className="text-green-500 text-small">
                  {displaynameSuccess}
                </p>
              )}
            </div>
          </div>
          
          {/* Email + User Type Section - 50% */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-lg">📧 Registered Email</p>
                <Button
                  size="sm"
                  variant="light"
                  onPress={() => setShowFullEmail(!showFullEmail)}
                  className="text-tiny"
                >
                  {showFullEmail ? '👁️‍🗨️ Hide' : '👁️ Show'}
                </Button>
              </div>
              <div 
                className={`font-medium break-all leading-tight w-full transition-all duration-300 cursor-pointer hover:bg-default-100 rounded-md p-2 -m-2 ${!showFullEmail ? 'blur-sm' : ''}`}
                style={{
                  fontSize: `clamp(0.875rem, 3vw, 1.5rem)`,
                  wordBreak: 'break-all'
                }}
                onClick={() => setShowFullEmail(!showFullEmail)}
                title="Click to toggle visibility"
              >
                {user.email}
              </div>
            </div>
            
            <div>
              <p className="text-lg mb-2">User Type</p>
              <div 
                className="font-medium break-all leading-tight w-full"
                style={{
                  fontSize: `clamp(0.875rem, 3vw, 1.5rem)`,
                  wordBreak: 'break-all'
                }}
              >
                {user.mqtt_usertype || 'Not specified'}
                {user.mqtt_usertype === 'wildhare' ? ' ⭐️' : user.mqtt_usertype === 'og' ? ' 🤠' : ''}
              </div>
            </div>
          </div>
        </div>
        </CardBody>
      )}
    </Card>
  );
}
