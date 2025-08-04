'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface QRSheetClientProps {
  id: string;
  remainingQuota: number;
  userEmail: string;
}

export default function QRSheetClient({ id, remainingQuota, userEmail }: QRSheetClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(true);

  useEffect(() => {
    const downloadPDF = async () => {
      try {
        const response = await fetch(`/api/qr/sheet/${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userEmail }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate PDF');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-sheet-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setIsDownloading(false);
        
        // Redirect after successful download
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } catch (error) {
        console.error('Error downloading PDF:', error);
        setError(error instanceof Error ? error.message : 'Failed to download PDF');
        setIsDownloading(false);
      }
    };

    downloadPDF();
  }, [id, userEmail, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">QR Sheet Generator</h1>
        <p className="text-gray-600 mb-4">
          Generating QR sheet for ID: <code className="bg-gray-100 px-2 py-1 rounded">{id}</code>
        </p>
        {isDownloading && (
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}
        <p className="text-sm text-gray-500">
          {isDownloading ? 'Your download should start automatically...' : 'Download complete!'}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Remaining quota: {remainingQuota - 1}/10
        </p>
        {!isDownloading && (
          <p className="text-xs text-gray-400 mt-4">
            Redirecting to home page in 3 seconds...
          </p>
        )}
      </div>
    </div>
  );
}