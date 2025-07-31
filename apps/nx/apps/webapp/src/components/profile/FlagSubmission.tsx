'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Input,
  Button,
  Select,
  SelectItem,
} from '@heroui/react';

type CtfOption = {
  id: string;
  name: string;
  description?: string;
};

type GhostData = {
  id: number;
  handle: string;
  name: string;
};

type FlagSubmissionProps = {
  ghosts?: GhostData[];
};

export default function FlagSubmission({ ghosts }: FlagSubmissionProps) {
  // Flag submission state
  const [ctfOptions, setCtfOptions] = useState<CtfOption[]>([]);
  const [selectedCtf, setSelectedCtf] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [flagValue, setFlagValue] = useState('');
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);
  const [flagSubmissionError, setFlagSubmissionError] = useState('');
  const [flagSubmissionSuccess, setFlagSubmissionSuccess] = useState('');

  useEffect(() => {
    const fetchCtfOptions = async () => {
      if (ghosts && ghosts.length > 0) {
        console.log(JSON.stringify(ghosts));
        const ctfOptionsFromGhosts: CtfOption[] = ghosts.map(ghost => ({
          id: ghost.handle,
          name: `${ghost.name} aka ${ghost.handle}`,
        }));
        setCtfOptions(ctfOptionsFromGhosts);
      }
    };

    fetchCtfOptions();
  }, [ghosts]);

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
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit flag';
      setFlagSubmissionError(errorMessage);
      
      // Clear error message after appropriate time
      const timeout = errorMessage === "Once is enough, don't you think?" ? 10000 : 5000;
      setTimeout(() => setFlagSubmissionError(''), timeout);
    } finally {
      setIsSubmittingFlag(false);
    }
  };

  return (
    <Card className="w-full mx-auto">
      <CardHeader className="flex gap-3">
        <div className="flex flex-col">
          <p className="text-lg">Submit Flag</p>
          <p className="text-small text-default-500">CTF challenge submission</p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
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
            <p className={`text-small ${
              flagSubmissionError === "Once is enough, don't you think?" 
                ? 'text-orange-500' 
                : 'text-red-500'
            }`}>
              {flagSubmissionError}
            </p>
          )}
          {flagSubmissionSuccess && (
            <p className="text-green-500 text-small">{flagSubmissionSuccess}</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}