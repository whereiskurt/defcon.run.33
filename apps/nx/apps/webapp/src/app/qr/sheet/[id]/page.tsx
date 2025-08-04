import { auth } from '@auth';
import { redirect } from 'next/navigation';
import QRSheetClient from './QRSheetClient';
import { getUserById } from '@db/user';

export default async function QRSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect('/api/auth/signin');
  }

  // Get user with quota information
  const user = await getUserById(session.user.email);
  
  if (!user) {
    redirect('/api/auth/signin');
  }

  const remainingQuota = user.quota?.qrSheet ?? 10;
  
  if (remainingQuota <= 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Quota Exceeded</h1>
          <p className="text-gray-600 mb-4">
            You have reached your QR sheet generation limit.
          </p>
          <p className="text-sm text-gray-500">
            You have used all {10} of your QR sheet generations.
          </p>
          <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  const { id } = await params;
  return <QRSheetClient id={id} remainingQuota={remainingQuota} userEmail={session.user.email} />;
}