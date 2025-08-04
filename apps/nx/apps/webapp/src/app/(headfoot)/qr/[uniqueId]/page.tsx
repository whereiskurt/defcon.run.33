import { auth } from '@auth';
import { redirect } from 'next/navigation';
import QRPageClient from './QRPageClient';

export default async function QRPage({ params }: { params: Promise<{ uniqueId: string }> }) {
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect('/api/auth/signin');
  }

  const { uniqueId } = await params;
  return <QRPageClient uniqueId={uniqueId} />;
}