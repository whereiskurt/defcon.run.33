'use client';

import { useState } from 'react';
import { useDisclosure } from '@heroui/react';
import CheckInDisplay from './CheckInDisplay';
import CheckInModal from '../check-in/CheckInModal';

interface CheckInDisplayClientProps {
  remainingQuota: number;
  userEmail: string;
}

export default function CheckInDisplayClient({ remainingQuota, userEmail }: CheckInDisplayClientProps) {
  const {
    isOpen: isCheckInOpen,
    onOpen: openCheckIn,
    onClose: closeCheckIn,
  } = useDisclosure();

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
      />
    </>
  );
}