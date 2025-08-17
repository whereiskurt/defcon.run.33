'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Button,
  Skeleton,
} from '@heroui/react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { ChevronDown, ChevronUp } from 'lucide-react';

type UserData = {
  email?: string;
  mqtt_username?: string;
  mqtt_password?: string;
  [key: string]: any;
};

export default function MqttCredentials() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState<{ username: boolean; password: boolean }>({
    username: false,
    password: false,
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        setUserData(data.user);
        setError(null);
      } catch (err) {
        setError(`Failed to fetch user data: ${err instanceof Error ? err.message : String(err)}`);
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const copyToClipboard = async (text: string, field: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(prev => ({ ...prev, [field]: true }));
      setTimeout(() => {
        setCopying(prev => ({ ...prev, [field]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex justify-between items-center pb-2">
          <div className="flex items-center gap-2">
            <div className="text-2xl">🔐</div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold">MQTT Credentials</h3>
              <p className="text-sm text-default-500">Your unique credentials</p>
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

  if (error) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader className="flex gap-3">
          <div className="flex flex-col">
            <p className="text-md text-red-500">Error Loading MQTT Credentials</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <p>{error}</p>
        </CardBody>
      </Card>
    );
  }

  if (!userData || !userData.mqtt_username || !userData.mqtt_password) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader className="flex gap-3">
          <div className="flex flex-col">
            <p className="text-md">MQTT Credentials</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <p>No MQTT credentials found for your account.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex justify-between items-center pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <div className="text-2xl">🔐</div>
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold">MQTT Credentials</h3>
            <p className="text-sm text-default-500">Your unique credentials</p>
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
            <div className="space-y-6">
              <div>
                <label className="block text-medium font-medium mb-2">Username</label>
                <div className="flex gap-3">
                  <Input
                    readOnly
                    value={userData.mqtt_username}
                    className="flex-grow"
                    variant="bordered"
                    size="md"
                  />
                  <Button
                    onClick={() => copyToClipboard(userData.mqtt_username || '', 'username')}
                    variant="flat"
                    color={copying.username ? "success" : "primary"}
                    size="lg"
                className="min-w-40"
              >
                {copying.username ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-medium font-medium mb-2">Password</label>
            <div className="flex gap-3">
              <Input
                readOnly
                value={userData.mqtt_password}
                className="flex-grow"
                type={showPassword ? "text" : "password"}
                variant="bordered"
                size="md"
                endContent={
                  <Button
                    isIconOnly
                    size="md"
                    variant="light"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 
                      <FaEyeSlash className="h-5 w-5" /> : 
                      <FaEye className="h-5 w-5" />
                    }
                  </Button>
                }
              />
              <Button
                onClick={() => copyToClipboard(userData.mqtt_password || '', 'password')}
                variant="flat"
                color={copying.password ? "success" : "primary"}
                size="lg"
                className="min-w-40"
              >
                {copying.password ? "Copied!" : "Copy"}
              </Button>
            </div>
              </div>
            </div>
          </CardBody>
          <Divider />
          <CardFooter>
            <p className="text-small text-default-500">
              These are your credentials for connecting to the MQTT broker. Use them to participate in the Meshtastic CTF.
            </p>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
