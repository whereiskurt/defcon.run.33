'use client';

import { useState, useEffect } from 'react';
import { useDisclosure } from '@heroui/react';
import CheckInDisplay from './CheckInDisplay';
import CheckInModal from '../check-in/CheckInModal';

interface CheckInDisplayClientProps {
  remainingQuota: number;
  userEmail: string;
  userPreference?: 'public' | 'private';
}

export default function CheckInDisplayClient({ remainingQuota, userEmail, userPreference }: CheckInDisplayClientProps) {
  const {
    isOpen: isCheckInOpen,
    onOpen: openCheckIn,
    onClose: closeCheckIn,
  } = useDisclosure();

  // Track the current user preference - default to 'public' if not provided
  const [currentUserPreference, setCurrentUserPreference] = useState<'public' | 'private'>(userPreference || 'public');

  // Listen for preference updates from UserDetails component
  useEffect(() => {
    const handleUserUpdated = (event: CustomEvent) => {
      if (event.detail?.checkin_preference) {
        setCurrentUserPreference(event.detail.checkin_preference);
      }
    };

    window.addEventListener('userUpdated', handleUserUpdated as EventListener);
    
    return () => {
      window.removeEventListener('userUpdated', handleUserUpdated as EventListener);
    };
  }, []);

  return (
    <>
      <CheckInDisplay 
        remainingQuota={remainingQuota}
        onOpenCheckInModal={openCheckIn}
      />
      <CheckInModal 
        isOpen={isCheckInOpen} 
        onClose={closeCheckIn}
        userEmail={userEmail}
        remainingQuota={remainingQuota}
        userPreference={currentUserPreference}
      />
    </>
  );
}