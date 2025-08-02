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
import { FaDesktop, FaPlus, FaStrava, FaTrophy, FaUserAlt } from 'react-icons/fa';
import { DashboardIcon } from './icon/dashboard';
import { LogoutIcon } from './icon/logout';
import { QRIcon } from './icon/qr';
import { useEffect, useState } from 'react';

import DCJackIcon from '@/public/header/dcjack.svg';

const iconClasses =
  'text-xl text-default-500 pointer-events-none flex-shrink-0';

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
      // alert(JSON.stringify(record.user.eqr));
      // console.log(`Got user detail: ${JSON.stringify(record.user)}`);
      setUserDetail(record.user);
    } catch (error) {
      console.error('Error fetching user details:', error);
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
          topContent={
            <User
              name={session.user.name}
              description={session.user.email}
              avatarProps={{
                ignoreFallback: true,
                size: 'lg',
                src: session.user.image ?? DCJackIcon.src,
              }}
              className="pt-2"
            />
          }
        >
          <DropdownSection aria-label="User Profile" showDivider>
            <></>
          </DropdownSection>
          <DropdownSection aria-label="User Profile" showDivider>
            <DropdownItem
              startContent={<FaUserAlt />}
              key="profile"
              className="gap-2 opacity-100"
              textValue="Profile"
              href="/profile"
            >
              Profile
            </DropdownItem>

            <DropdownItem
              startContent={<FaTrophy />}
              key="leaderboard"
              className="gap-2 opacity-100"
              textValue="Leaderboard"
              href="/leaderboard"
            >
              Leaderboard
            </DropdownItem>

            <DropdownItem
              startContent={<FaDesktop className={iconClasses} />}
              key="dashboard"
              className="opacity-100"
              textValue="Dashboard"
              showDivider
              href="/dashboard"
            >
              Dashboard
            </DropdownItem>

            <DropdownItem
              startContent={<QRIcon className={iconClasses} />}
              key="showqr"
              className="gap-2 opacity-100"
              textValue="showqr"
              onClick={() => showQR()}
            >
              Show My QR
            </DropdownItem>
          </DropdownSection>
          
          {!session.user.hasStrava ? (
            <DropdownSection aria-label="Profile & Actions" showDivider>
              <DropdownItem
                startContent={
                  <FaStrava color="red" size={24} className={iconClasses} />
                }
                onClick={() => signIn('strava', { callbackUrl: '/dashboard' })}
                textValue="Link to Strava"
                key="strava"
              >
                Link to Strava
              </DropdownItem>
            </DropdownSection>
          ) : null}

          <DropdownSection aria-label="Logoutk">
            <DropdownItem
              startContent={<LogoutIcon className={iconClasses} />}
              key="logout"
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
            <ModalHeader className="flex flex-col gap-1 text-center">
              Unique QR Code
            </ModalHeader>
            <ModalBody>
              <img src={userDetail.eqr} />
            </ModalBody>
            <ModalFooter>
              <Button
                size="lg"
                color="danger"
                variant="light"
                onClick={closeWindow}
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
