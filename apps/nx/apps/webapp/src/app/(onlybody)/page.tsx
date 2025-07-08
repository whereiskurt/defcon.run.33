'use client';

import Image from 'next/image';
import BunnyBlack from '@/public/login/bunny-face-dark.svg';

import { Text } from '@components/text-effects/Common';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

export default function Home() {
  const defaultTheme = 'dark'; // Default theme if none is set

  const { theme, resolvedTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<string>(defaultTheme); // Default to light for initial render

  useEffect(() => {
    const detectTheme = () => {
      if (document.documentElement.classList.contains('dark')) {
        setCurrentTheme('dark');
      } else if (document.documentElement.classList.contains('light')) {
        setCurrentTheme('light');
      } else if (document.documentElement.classList.contains('modern')) {
        setCurrentTheme('modern');
      } else {
        setCurrentTheme(resolvedTheme || theme || defaultTheme);
      }
    };

    detectTheme();

    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [resolvedTheme, theme]);

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-b to-black from-gray-900 text-white">
      <Text variant="large" className="p-10 text-center">
        Run. Defcon. Run.
      </Text>
      <div className="flex justify-center items-center">
        <Link href="/login/auth">
          <Image alt="Bunny" priority={true} src={BunnyBlack} />
        </Link>
      </div>
      <Text variant="large" className="p-10 text-center">
        Run. Defcon. Run.
      </Text>
    </div>
  );
}
