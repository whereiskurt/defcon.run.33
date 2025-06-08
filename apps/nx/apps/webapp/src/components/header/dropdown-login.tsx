'use client';

import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
} from '@heroui/react';
import { signIn } from 'next-auth/react';
import { FaDiscord, FaGithub, FaStrava } from 'react-icons/fa';
import { FiLogIn } from 'react-icons/fi';
import { MdOutlineMailLock } from 'react-icons/md';

const iconClasses =
  'text-xl text-default-500 pointer-events-none flex-shrink-0';

const LoginDropDown = (params: any) => {
  const session = params.session;
  return (
    <Dropdown
      showArrow
      radius="sm"
      backdrop="blur"
      classNames={{
        base: 'before:bg-default-200', // change arrow background
        content: 'p-0 border-small border-divider bg-background',
      }}
    >
      <DropdownTrigger>
        <Button variant="ghost">
          Login <FiLogIn size={24} />{' '}
        </Button>
      </DropdownTrigger>

      <DropdownMenu
        aria-label="Custom item styles"
        className="p-3"
        itemClasses={{
          base: [
            'rounded-md',
            'text-default-800',
            'transition-opacity',
            'data-[hover=true]:text-foreground',
            'data-[hover=true]:bg-default-100',
            'dark:data-[hover=true]:bg-default-50',
            'data-[selectable=true]:focus:bg-default-50',
            'data-[pressed=true]:opacity-70',
            'data-[focus-visible=true]:ring-default-500',
          ],
        }}
      >
        <DropdownSection>
          <DropdownItem
            key="c1"
            startContent={
              <MdOutlineMailLock size={24} className={iconClasses} />
            }
            onPress={() => signIn('email')}
          >
            Email Account
          </DropdownItem>
        </DropdownSection>
        <DropdownSection
          aria-label="Login Options"
          title={'OAuth Provider'}
          showDivider={true}
        >
          <DropdownItem
            key="a1"
            startContent={<FaDiscord size={24} className={iconClasses} />}
            onPress={() => signIn('discord', { callbackUrl: '/welcome' })}
          >
            Discord
          </DropdownItem>
          <DropdownItem
            key="b1"
            startContent={<FaGithub size={24} className={iconClasses} />}
            onPress={() => signIn('github', { callbackUrl: '/welcome' })}
          >
            Github
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
};

export default LoginDropDown;
