import '@/styles/globals.css';
import { Metadata, Viewport } from 'next';
import { Link } from '@heroui/link';
import clsx from 'clsx';

import { Providers } from '@/src/app/providers';

import { siteConfig } from '@/config/site';
import { fontSans } from '@fonts';
import { Header } from '@header';
import { auth } from '@auth';
import { SessionProvider } from 'next-auth/react';

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        <Providers themeProps={{ attribute: 'class', defaultTheme: 'dark' }}>
          <SessionProvider>
            <div className="relative flex flex-col h-screen">
              <Header session={session} />
              <main className="container mx-auto max-w-7xl px-6 flex-grow max-w-[900px]">
                {children}
              </main>
              <footer className="w-full flex items-center justify-center py-3">
                <Link
                  isExternal
                  className="flex items-center gap-1 text-current"
                  href="https://heroui.com?utm_source=next-app-template"
                  title="heroui.com homepage"
                >
                  <span className="text-default-600">Powered by</span>
                  <p className="text-primary">HeroUI</p>
                </Link>
              </footer>
            </div>
          </SessionProvider>
        </Providers>
      </body>
    </html>
  );
}
