'use client';

import {
  addToast,
  Avatar,
  Button,
  Link,
  Navbar,
  NavbarContent,
  NavbarItem,
  Tooltip,
} from '@heroui/react';
import dynamic from 'next/dynamic';
import { GrMapLocation } from 'react-icons/gr';
import { MenuIcon } from './icon/menu';
import { Logo } from './logo-icon';

import { FaQuestion } from 'react-icons/fa';
import { FaMoneyCheckDollar, FaRadio, FaFire } from 'react-icons/fa6';

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
import { APP_VERSION_TOOLTIP } from '../../config/version';

export function Header(params: any) {
  const session = params.session;
  const hasSession = session !== null;
  return (
    <Navbar isBordered className="mx-auto max-w-[900px]">
      <NavbarContent className="sm:hidden" justify="start">
        <NavbarItem>
          <MenuDropDown session={session} />
        </NavbarItem>
      </NavbarContent>
      <NavbarContent className="sm:hidden" justify="center">
        <NavbarItem className="">
          <Tooltip content={APP_VERSION_TOOLTIP} placement="bottom">
            <Link color="foreground" href="/dashboard">
              <Logo />
            </Link>
          </Tooltip>
        </NavbarItem>
      </NavbarContent>
      <NavbarContent className="sm:flex hidden" justify="center">
          <>
            <NavbarItem>
              <Tooltip content={APP_VERSION_TOOLTIP} placement="bottom">
                <Link color="foreground" href="/dashboard">
                  <Logo />
                </Link>
              </Tooltip>
            </NavbarItem>
          </>
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
            <NavbarItem>
              <Link className='p-0 m-0' color="foreground" href="/heatmap">
                <Button variant="ghost">
                  <FaFire size={24} />
                  HeatMap
                </Button>
              </Link>
            </NavbarItem>
          </>
        ) : (
          <>
          <NavbarItem>
              <Link color="foreground" href="/routes">
                <Button variant="ghost">
                  <GrMapLocation size={24} />
                  Routes
                </Button>
              </Link>
            </NavbarItem>
            <NavbarItem>
              <Link className='p-0 m-0' color="foreground" href="/heatmap">
                <Button variant="ghost">
                  <FaFire size={24} />
                  HeatMap
                </Button>
              </Link>
            </NavbarItem>
          </>
        )}
        <NavbarItem>
          <Link color="foreground" href="/meshtastic">
            <Button variant="ghost">
              <FaRadio size={24} />
              Meshtastic
            </Button>
          </Link>
        </NavbarItem>


        <NavbarItem>
          <Link color="foreground" href="/contributors">
            <Button variant="ghost">
              <FaMoneyCheckDollar size={24} />
              Contributors
            </Button>
          </Link>
        </NavbarItem>

      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem>
          <ThemeSwitch />
        </NavbarItem>
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
      </NavbarContent>
    </Navbar>
  );
}
