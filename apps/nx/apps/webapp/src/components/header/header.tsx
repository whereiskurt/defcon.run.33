'use client';

import {
  addToast,
  Avatar,
  Button,
  Link,
  Navbar,
  NavbarContent,
  NavbarItem,
} from '@heroui/react';
import dynamic from 'next/dynamic';
import { GrMapLocation } from 'react-icons/gr';
import { MenuIcon } from './icon/menu';
import { Logo } from './logo-icon';

import { FaQuestion } from 'react-icons/fa';
import { FaMoneyCheckDollar } from 'react-icons/fa6';

const UserDropDown = dynamic(() => import('./dropdown-user'), {
  ssr: false,
});
const LoginDropDown = dynamic(() => import('./dropdown-login'), {
  ssr: false,
});
const MenuDropDown = dynamic(() => import('./dropdown-menu'), {
  ssr: false,
});

import { ThemeSwitch } from '../theme-switch';

export function Header(params: any) {
  const session = params.session;
  const hasSession = session !== null;
  return (
    <Navbar isBordered className="mt-2 mx-auto my-2 max-w-[900px]">
      <NavbarContent className="sm:hidden" justify="start">
        <NavbarItem>
          <MenuDropDown session={session} />
        </NavbarItem>
      </NavbarContent>
      <NavbarContent className="sm:hidden" justify="center">
        <NavbarItem className="">
          <Logo />
        </NavbarItem>
      </NavbarContent>
      <NavbarContent className="sm:flex hidden" justify="center">
        {hasSession ? (
          <>
            <NavbarItem>
              <Link color="foreground" href="/dashboard">
                <Logo />
              </Link>
            </NavbarItem>
          </>
        ) : (
          <>
            <NavbarItem>
              <Link color="foreground" href="/login/auth">
                <Logo />
              </Link>
            </NavbarItem>
          </>
        )}
        {/* <NavbarItem>
            <Link color="foreground" href="/dashboard">
              <Badge content="NEW" color="primary" size="lg">
                <Button variant="ghost">
                  <IoMegaphoneOutline size={24} />
                  News
                </Button>
              </Badge>
            </Link>
          </NavbarItem> */}
        {hasSession ? (
          <>
            <NavbarItem>
              <Link color="foreground" href="/routes">
                <Button variant="ghost">
                  <GrMapLocation size={24} />
                  Routes
                </Button>
              </Link>
            </NavbarItem>
          </>
        ) : (
          <></>
        )}
        <NavbarItem>
          <Link color="foreground" href="/faq">
            <Button variant="ghost">
              <FaQuestion size={24} />
              FAQ
            </Button>
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link color="foreground" href="/sponsors">
            <Button variant="ghost">
              <FaMoneyCheckDollar size={24} />
              Sponsors
            </Button>
          </Link>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent justify="end">
        {hasSession ? (
          <>
            <NavbarItem>
              <UserDropDown session={session} />
            </NavbarItem>
          </>
        ) : (
          <>
            <NavbarItem>
              <LoginDropDown />
            </NavbarItem>
          </>
        )}
        <NavbarItem>
          <ThemeSwitch />
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
