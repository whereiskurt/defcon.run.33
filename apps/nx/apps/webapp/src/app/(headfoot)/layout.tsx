import '@/styles/globals.css';
import { Metadata, Viewport } from 'next';
import { Link, Tooltip } from '@heroui/react';
import clsx from 'clsx';

import { Providers } from '@/src/app/providers';

import { siteConfig } from '@/config/site';
import { APP_VERSION_TOOLTIP } from '../../config/version';
import { fontSans } from '@fonts';
import { Header } from '@header';
import { auth } from '@auth';
import { SessionProvider } from 'next-auth/react';
import { redirect } from 'next/navigation';

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
  if (process.env.NODE_ENV === 'development') {
  } else {
    if (!session) redirect('/login/auth');
  }
  

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
            <div className="relative flex flex-col min-h-screen">
              <div className="flex-shrink-0">
                <Header session={session} />
              </div>
              <main className="container mx-auto max-w-7xl px-6 flex-grow max-w-[900px] pt-4 pb-2">
                {children}
              </main>
              <footer className="w-full flex items-center justify-center py-3 flex-shrink-0 relative z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-divider">
                <Tooltip content={APP_VERSION_TOOLTIP} placement="top">
                  <Link
                    className="flex items-center gap-1 text-current"
                    href="/contributors"
                    title="No Bystanders"
                  >
                    <span className="text-default-600"></span>
                    <p className="text-primary">
                      👟 Casual Ultra + NeverDNF + You 🐇
                    </p>
                  </Link>
                </Tooltip>
              </footer>
            </div>
          </SessionProvider>
        </Providers>
      </body>
    </html>
  );
}
