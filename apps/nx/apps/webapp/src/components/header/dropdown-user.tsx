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
import { FaPlus, FaStrava, FaTrophy, FaUserAlt, FaSync } from 'react-icons/fa';
import { MapPin } from 'lucide-react';
import { LogoutIcon } from './icon/logout';
import { QRIcon } from './icon/qr';
import { useEffect, useState } from 'react';
import CardMatrixLoader from '../profile/CardMatrixLoader';
import GPXUploadModal from '../gpx/GPXUploadModal';
import CheckInModal from '../check-in/CheckInModal';

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
  const {
    isOpen: isGPXOpen,
    onOpen: openGPX,
    onClose: closeGPX,
  } = useDisclosure();
  const {
    isOpen: isCheckInOpen,
    onOpen: openCheckIn,
    onClose: closeCheckIn,
  } = useDisclosure();
  const [userDetail, setUserDetail] = useState<any>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [canSync, setCanSync] = useState<boolean>(true);
  const [syncsRemaining, setSyncsRemaining] = useState<number | null>(null); // null means loading
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

  // Check if user can sync (check total quota)
  const checkSyncQuota = (userData?: any) => {
    try {
      const user = userData || userDetail;
      console.log('Checking sync quota, user data:', user);
      
      // Check the total sync quota (16 total syncs)
      const totalQuota = user?.quota?.stravaSync ?? 16;
      
      console.log('Total sync quota remaining:', totalQuota);
      
      setSyncsRemaining(totalQuota);
      setCanSync(totalQuota > 0);
      return totalQuota;
    } catch (error) {
      console.error('Error checking sync quota:', error);
      // Default to showing quota if check fails
      setCanSync(true);
      setSyncsRemaining(16);
      return 16;
    }
  };

  // Handle Strava sync
  const handleStravaSync = async () => {
    // Immediately decrement the count optimistically
    setSyncsRemaining(prev => prev !== null ? Math.max(0, prev - 1) : 0);
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
        // Parse the response to get the updated quota
        const syncData = await response.json();
        console.log('Sync response:', syncData);
        
        // Update remaining syncs from the API response
        if (syncData.remainingQuota !== undefined) {
          setSyncsRemaining(syncData.remainingQuota);
          setCanSync(syncData.remainingQuota > 0);
        }
        
        // Also refresh user details to sync all data
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
          // Double-check quota from user data if not in sync response
          if (syncData.remainingQuota === undefined) {
            checkSyncQuota(record.user);
          }
        }
        
        // Trigger leaderboard refresh if user is on leaderboard page
        if (typeof window !== 'undefined' && window.location.pathname === '/leaderboard') {
          window.location.reload();
        }
        
        // Also dispatch a custom event for any other components listening
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('stravaSync', { 
            detail: { success: true, timestamp: Date.now() } 
          }));
        }
        
        // Reset success state after 4 seconds (2x longer)
        setTimeout(() => setSyncSuccess(false), 4000);
      } else {
        // If sync failed due to quota, parse the response
        const errorData = await response.json();
        console.error('Sync failed:', errorData);
        
        // If it's a quota error, update the remaining count from the response
        if (response.status === 429 && errorData.remainingQuota !== undefined) {
          setSyncsRemaining(errorData.remainingQuota);
          setCanSync(errorData.remainingQuota > 0);
        } else {
          // Otherwise restore the count
          setSyncsRemaining(prev => prev !== null ? Math.min(16, prev + 1) : 16);
        }
      }
    } catch (error) {
      console.error('Error syncing Strava:', error);
      // If sync failed, restore the count
      setSyncsRemaining(prev => prev !== null ? Math.min(16, prev + 1) : 16);
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

  // Add effect to refresh user details on window focus (when user comes back from profile page)
  useEffect(() => {
    const handleFocus = () => {
      if (session?.user?.email) {
        fetchUserDetails();
      }
    };

    // Also listen for custom events when user data is updated
    const handleUserUpdate = () => {
      fetchUserDetails();
    };

    const handleDisplaynameUpdate = () => {
      fetchUserDetails();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('userUpdated', handleUserUpdate);
    window.addEventListener('displaynameUpdated', handleDisplaynameUpdate);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('userUpdated', handleUserUpdate);
      window.removeEventListener('displaynameUpdated', handleDisplaynameUpdate);
    };
  }, [session?.user?.email]);

  if (!session || !session.user) return <></>;

  return (
    <>
      {LogoutModal(isLogoutOpen, closeLogout)}
      {QRModal(isQROpen, closeQR, userDetail)}
      <GPXUploadModal isOpen={isGPXOpen} onClose={closeGPX} />
      <CheckInModal 
        isOpen={isCheckInOpen} 
        onClose={closeCheckIn}
        userEmail={session.user.email || ''}
        remainingQuota={userDetail?.quota?.checkIns ?? 50}
      />
      <Dropdown
        backdrop="blur"
        showArrow
        radius="sm"
        closeOnSelect={false}
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
            if (key === 'sync-strava' && canSync && !syncing && syncsRemaining !== null) {
              handleStravaSync();
              return; // Prevent default dropdown close behavior
            }
            // Handle manual add action
            if (key === 'add-activity') {
              openGPX();
            }
            // Handle check-in action
            if (key === 'check-in') {
              openCheckIn();
            }
          }}
          topContent={
            <User
              name={userDetail?.displayname ? `🐰 ${userDetail.displayname}` : session.user.name}
              description={
                <div className="flex flex-col">
                  {userDetail?.displayname && (
                    <span className="text-sm text-default-600">{session.user.name}</span>
                  )}
                  <span className="text-xs text-default-400">{session.user.email}</span>
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
              closeOnSelect={true}
            >
              Profile
            </DropdownItem>

            <DropdownItem
              startContent={<FaTrophy />}
              key="leaderboard"
              className="gap-2 opacity-100 py-2 text-base"
              textValue="Leaderboard"
              href="/leaderboard"
              closeOnSelect={true}
            >
              Leaderboard
            </DropdownItem>
          </DropdownSection>
          
          <DropdownSection aria-label="Activity Management" showDivider>
            <DropdownItem
              startContent={
                <MapPin color="blue" size={16} className={iconClasses} />
              }
              className="py-2 text-base"
              textValue="GPS Check-in"
              key="check-in"
              closeOnSelect={true}
            >
              GPS Check-in
            </DropdownItem>
            <DropdownItem
              startContent={
                <FaPlus color="green" size={16} className={iconClasses} />
              }
              className="py-2 text-base"
              textValue="Add Activity"
              key="add-activity"
              closeOnSelect={true}
            >
              Add Activity
            </DropdownItem>
          </DropdownSection>
          
          {!session.user.hasStrava ? (
            <DropdownSection aria-label="Strava Integration" showDivider>
              <DropdownItem
                startContent={
                  <FaStrava color="red" size={24} className={iconClasses} />
                }
                className="py-2 text-base"
                onPress={() => signIn('strava', { callbackUrl: '/dashboard' })}
                textValue="Link to Strava"
                key="strava"
                closeOnSelect={true}
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
                    color={syncSuccess ? "green" : (syncsRemaining !== null && syncsRemaining > 0 && !syncing ? "red" : undefined)}
                    className={`${iconClasses} ${syncing ? 'animate-spin' : ''}`} 
                  />
                }
                className={`py-2 text-base ${syncSuccess ? 'text-success' : ''} ${syncing ? 'text-default-400' : ''} ${!canSync ? 'opacity-50' : ''}`}
                textValue="Sync Strava"
                key="sync-strava"
                isDisabled={syncing || !canSync || syncsRemaining === null}
                closeOnSelect={false}
              >
                {syncing ? 'Syncing...' : syncSuccess ? 'Sync success' : syncsRemaining !== null ? `Sync Strava (${syncsRemaining} remain)` : 'Sync Strava (...)'}
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
              closeOnSelect={true}
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
              closeOnSelect={true}
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
            <ModalHeader className="flex flex-col gap-1 text-center pb-2">
              <div className="text-2xl font-bold text-primary drop-shadow-lg">
                🐰 Your Social QR 🥕
              </div>
              <div className="text-sm text-default-500">Share to connect with other rabbits!</div>
            </ModalHeader>
            <ModalBody className="p-0 pt-0">
              {hasQR ? (
                <div className="p-0 overflow-hidden">
                  <img src={userDetail.eqr} className="w-full scale-110 -m-[0px]" />
                </div>
              ) : (
                <CardMatrixLoader text="PROCESSING QR CODE" height="300px" />
              )}
            </ModalBody>
            <ModalFooter className="flex justify-center -mt-[10px]">
              <Button
                size="lg"
                color="success"
                variant="solid"
                radius="full"
                onPress={closeWindow}
                className="px-8 py-3 text-lg font-semibold min-w-[150px]"
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
