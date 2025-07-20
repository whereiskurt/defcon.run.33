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
  Spinner,
} from '@heroui/react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

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
      <div className="flex justify-center items-center p-8">
        <Spinner size="lg" />
      </div>
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
    <Card className="max-w-sm mx-auto">
      <CardHeader className="flex gap-3">
        <div className="flex flex-col">
          <p className="text-lg">MQTT Credentials</p>
          <p className="text-small text-default-500">Use these credentials to connect to the MQTT broker</p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        <div className="space-y-4">
          <div>
            <label className="block text-small font-medium mb-1">Username</label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={userData.mqtt_username}
                className="flex-grow"
                variant="bordered"
              />
              <Button
                onClick={() => copyToClipboard(userData.mqtt_username || '', 'username')}
                variant="flat"
                color={copying.username ? "success" : "primary"}
              >
                {copying.username ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-small font-medium mb-1">Password</label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={userData.mqtt_password}
                className="flex-grow"
                type={showPassword ? "text" : "password"}
                variant="bordered"
                endContent={
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 
                      <FaEyeSlash className="h-4 w-4" /> : 
                      <FaEye className="h-4 w-4" />
                    }
                  </Button>
                }
              />
              <Button
                onClick={() => copyToClipboard(userData.mqtt_password || '', 'password')}
                variant="flat"
                color={copying.password ? "success" : "primary"}
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
          Keep these credentials secure and don't share them with others.
        </p>
      </CardFooter>
    </Card>
  );
}
