'use client';

import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
  Input,
} from '@heroui/react';

import type React from 'react';
import { fontMuseo } from '@/config/fonts';
import BlurPulseBackground from '@/src/components/BlurPulseBackground';
import { GlitchLabel, RainbowText } from '@/src/components/text-effects';
import Text from '@/src/components/ui/Text';
import { Heading } from '@/src/components/ui/typography';

import { Key, Wand } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';

export default function UnlockForm() {
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInviteCodeFocused, setIsInviteCodeFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Here you would typically send the data to your backend
    console.log({ email, inviteCode });

    // setIsSubmitting(false);

    window.location.href = `/auth/verify?email=${email}`; // This will perform a full page reload

    return false;
  };

  const theme = useTheme();

  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
      <BlurPulseBackground imagePath={`/bunny-theme-${theme.theme}.svg`} />
      <div className="z-10 w-full max-w-md" >
        <form onSubmit={handleSubmit} className="w-full">
          <Card className="shadow-lg bg-black">
            <CardHeader>
              <div className="flex flex-col">
                <Heading level={1}>
                  {isSubmitting ? (
                    <RainbowText text={'Welcome!'} />
                  ) : (
                    'Welcome!'
                  )}
                </Heading>
                <Text variant="small">
                  We don&apos;t store passwords but require an email address.
                </Text>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-6">
              <div className="space-y-3 w-full">
                <Heading level={4}>
                  <label
                    htmlFor="email"
                    className={`block text-lg font-medium`}
                  >
                    {isEmailFocused ? (
                      <RainbowText text='Email Address' />
                    ) : (
                      'Email Address'
                    )}
                  </label>
                </Heading>
                <div className="relative w-full">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="text-lg w-full"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-3 w-full">
                <label
                  htmlFor="inviteCode"
                  className={`block text-lg font-medium pt-2 ${fontMuseo.className}`}
                >
                  {isInviteCodeFocused ? (
                    <GlitchLabel>Invite Codes</GlitchLabel>
                  ) : (
                    'Invite Codes'
                  )}
                </label>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                    <Key className="h-5 w-5" />
                  </div>
                  <Input
                    id="inviteCode"
                    type="text"
                    placeholder="hacktheplanet"
                    className="text-lg w-full"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    onFocus={() => setIsInviteCodeFocused(true)}
                    onBlur={() => setIsInviteCodeFocused(false)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </CardBody>
            <Divider className="mt-2" />
            <CardFooter className="justify-center">
              <Button
                type="submit"
                variant="solid"
                color="primary"
                className="text-lg font-semibold w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <GlitchLabel className={fontMuseo.className}>
                    Processing
                  </GlitchLabel>
                ) : (
                  <>
                    Send Magic Link <Wand />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}
