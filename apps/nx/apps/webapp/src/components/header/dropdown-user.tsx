'use client';

import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  User,
  useDisclosure,
} from '@heroui/react';
import { signIn, signOut, useSession } from 'next-auth/react';

import { useRouter } from 'next/navigation';
import { FaFire, FaPlus, FaStrava, FaTrophy, FaUserAlt, FaSync } from 'react-icons/fa';
import { LogoutIcon } from './icon/logout';
import { QRIcon } from './icon/qr';
import { useEffect, useState } from 'react';
import CardMatrixLoader from '../profile/CardMatrixLoader';

import DCJackIcon from '@/public/header/dcjack.svg';

const iconClasses =
  'text-2xl text-default-500 pointer-events-none flex-shrink-0';

const UserDropDown = (params: any) => {
  const {
    isOpen: isLogoutOpen,
    onOpen: openLogout,
    onClose: closeLogout,
  } = useDisclosure();
  const {
    isOpen: isQROpen,
    onOpen: openQR,
    onClose: closeQR,
  } = useDisclosure();
  const [userDetail, setUserDetail] = useState<any>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [canSync, setCanSync] = useState<boolean>(true);
  const [syncsRemaining, setSyncsRemaining] = useState<number>(4);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const router = useRouter();

  // Fetch user details once when component mounts
  const fetchUserDetails = async () => {
    try {
      const res = await fetch('/api/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok || res.status !== 200) {
        throw new Error('Failed to get User details.');
      }
      const record = await res.json();
      setUserDetail(record.user);
      
      // Check sync quota if user has Strava
      if (session?.user?.hasStrava) {
        checkSyncQuota(record.user);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  // Check if user can sync (hasn't exceeded daily limit)
  const checkSyncQuota = (userData?: any) => {
    try {
      const user = userData || userDetail;
      console.log('Checking sync quota, user data:', user);
      console.log('Strava account data:', user?.strava_account);
      
      const syncHistory = user?.strava_account?.sync_history || [];
      const today = new Date().setHours(0, 0, 0, 0);
      const todaysSyncs = syncHistory.filter((syncTime: number) => syncTime >= today);
      
      console.log('Sync history:', syncHistory);
      console.log('Today\'s syncs:', todaysSyncs);
      
      const remaining = Math.max(0, 4 - todaysSyncs.length);
      setSyncsRemaining(remaining);
      setCanSync(remaining > 0);
      return remaining;
    } catch (error) {
      console.error('Error checking sync quota:', error);
      setCanSync(true); // Default to allowing sync if check fails
      setSyncsRemaining(4);
      return 4;
    }
  };

  // Handle Strava sync
  const handleStravaSync = async () => {
    // Immediately decrement the count optimistically
    setSyncsRemaining(prev => Math.max(0, prev - 1));
    setSyncing(true);
    setSyncSuccess(false);
    
    try {
      const response = await fetch('/api/strava/sync-smart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSyncSuccess(true);
        // Refresh user details to get updated data with new sync history
        const res = await fetch('/api/user', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const record = await res.json();
          console.log('User data after sync:', record.user);
          setUserDetail(record.user);
          // Update sync quota with fresh data
          const newRemaining = checkSyncQuota(record.user);
          // Make sure we actually decremented
          if (newRemaining === syncsRemaining) {
            // Force decrement if server didn't update yet
            setSyncsRemaining(prev => Math.max(0, prev - 1));
          }
        }
        
        // Reset success state after 4 seconds (2x longer)
        setTimeout(() => setSyncSuccess(false), 4000);
      } else {
        // If sync failed, restore the count
        setSyncsRemaining(prev => Math.min(4, prev + 1));
      }
    } catch (error) {
      console.error('Error syncing Strava:', error);
      // If sync failed, restore the count
      setSyncsRemaining(prev => Math.min(4, prev + 1));
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!userDetail) {
      fetchUserDetails();
    }
  }, []); // Empty dependency array means this runs once after initial render

  const showLogoutModal = () => {
    openLogout();
  };

  const showQR = () => {
    openQR();
  };

  const { data: session, update, status } = useSession();

  if (!session || !session.user) return <></>;

  return (
    <>
      {LogoutModal(isLogoutOpen, closeLogout)}
      {QRModal(isQROpen, closeQR, userDetail)}
      <Dropdown
        backdrop="blur"
        showArrow
        radius="sm"
        closeOnSelect={true}
        classNames={{
          base: 'before:bg-default-200', // change arrow background
          content: 'p-0 border-small border-divider bg-background',
        }}
      >
        <DropdownTrigger>
          <Avatar
            src={session.user.image ?? DCJackIcon.src}
            ignoreFallback={true}
            size="lg"
          />
        </DropdownTrigger>

        <DropdownMenu
          aria-label="Custom item styles"
          disabledKeys={['profile_example']}
          onAction={(key) => {
            // Handle sync action
            if (key === 'sync-strava' && canSync && !syncing) {
              handleStravaSync();
            }
          }}
          topContent={
            <User
              name={session.user.name}
              description={
                <div className="flex flex-col">
                  <span>{session.user.email}</span>
                  {userDetail?.displayname && (
                    <span className="text-xs text-default-400">🐰 {userDetail.displayname}</span>
                  )}
                </div>
              }
              avatarProps={{
                ignoreFallback: true,
                size: 'lg',
                src: session.user.image ?? DCJackIcon.src,
              }}
              className="pt-2 pb-2"
            />
          }
        >
          <DropdownSection aria-label="Divider" showDivider>
            <></>
          </DropdownSection>
          <DropdownSection aria-label="User Profile" showDivider>
            <DropdownItem
              startContent={<FaUserAlt />}
              key="profile"
              className="gap-2 opacity-100 py-2 text-base"
              textValue="Profile"
              href="/profile"
            >
              Profile
            </DropdownItem>

            <DropdownItem
              startContent={<FaTrophy />}
              key="leaderboard"
              className="gap-2 opacity-100 py-2 text-base"
              textValue="Leaderboard"
              href="/leaderboard"
            >
              Leaderboard
            </DropdownItem>
          </DropdownSection>
          
          <DropdownSection aria-label="Heat Map" showDivider>
            <DropdownItem
              startContent={<FaFire color="red" className={iconClasses} />}
              key="heatmap"
              className="opacity-100 py-2 text-base"
              textValue="Heat Map"
              isReadOnly={true}
            >
              Heat Map
            </DropdownItem>
          </DropdownSection>
          
          {!session.user.hasStrava ? (
            <DropdownSection aria-label="Profile & Actions" showDivider>
              <DropdownItem
                startContent={
                  <FaStrava color="red" size={24} className={iconClasses} />
                }
                className="py-2 text-base"
                onPress={() => signIn('strava', { callbackUrl: '/dashboard' })}
                textValue="Link to Strava"
                key="strava"
              >
                Link to Strava
              </DropdownItem>
            </DropdownSection>
          ) : (
            <DropdownSection aria-label="Strava Actions" showDivider>
              <DropdownItem
                startContent={
                  <FaSync 
                    size={16} 
                    color={syncsRemaining > 0 && !syncing ? "red" : undefined}
                    className={`${iconClasses} ${syncing ? 'animate-spin' : ''}`} 
                  />
                }
                className={`py-2 text-base ${syncSuccess ? 'text-success' : ''} ${syncing ? 'text-default-400' : ''} ${!canSync ? 'opacity-50' : ''}`}
                textValue="Sync Strava"
                key="sync-strava"
                isDisabled={syncing || !canSync}
                closeOnSelect={false}
              >
                {syncing ? 'Syncing...' : syncSuccess ? 'Sync success' : `Sync Strava (${syncsRemaining} left)`}
              </DropdownItem>
              <DropdownItem
                startContent={
                  <FaPlus color="green" size={16} className={iconClasses} />
                }
                className="py-2 text-base"
                textValue="Manual Add..."
                key="add-activity"
                isReadOnly={true}
              >
                Manual Add...
              </DropdownItem>
            </DropdownSection>
          )}

          <DropdownSection aria-label="QR Code" showDivider>
            <DropdownItem
              startContent={<QRIcon className={iconClasses} />}
              key="showqr"
              className="gap-2 opacity-100 py-2 text-base"
              textValue="showqr"
              onPress={() => showQR()}
            >
              Show My QR
            </DropdownItem>
          </DropdownSection>

          <DropdownSection aria-label="Logout">
            <DropdownItem
              startContent={<LogoutIcon className={iconClasses} />}
              key="logout"
              className="py-2 text-base"
              textValue="Logout"
              onPress={() => showLogoutModal()}
            >
              Logout
            </DropdownItem>
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>
    </>
  );
};

export default UserDropDown;

function LogoutModal(isOpen: boolean, onClose: () => void) {
  const doLogout = () => {
    onClose();
    signOut();
  };
  const closeWindow = () => {
    onClose();
  };
  return (
    <Modal
      size={'sm'}
      placement="center"
      isOpen={isOpen}
      backdrop="blur"
      onClose={closeWindow}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">Logout?</ModalHeader>
            <ModalBody>
              <p>Do you want to Logout of DEFCON.run? </p>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onClick={doLogout}>
                Logout
              </Button>
              <Button color="primary" onClick={closeWindow}>
                Stay Logged In
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

function QRModal(isOpen: boolean, onClose: () => void, userDetail: any) {
  const closeWindow = () => {
    onClose();
  };
  
  const hasQR = userDetail?.eqr;
  
  return (
    <Modal
      size={'sm'}
      placement="center"
      isOpen={isOpen}
      backdrop="blur"
      onClose={closeWindow}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1 text-center">
              Unique QR Code
            </ModalHeader>
            <ModalBody className="p-0">
              {hasQR ? (
                <div className="p-4">
                  <img src={userDetail.eqr} className="w-full" />
                </div>
              ) : (
                <CardMatrixLoader text="PROCESSING QR CODE" height="300px" />
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                size="lg"
                color="danger"
                variant="light"
                onPress={closeWindow}
              >
                Done
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
