'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardBody, Spinner } from '@heroui/react';
import { CheckCircle, XCircle } from 'lucide-react';

export default function QRPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [points, setPoints] = useState(0);
  const [userDisplayName, setUserDisplayName] = useState('');
  const claimAttemptRef = useRef(false);

  // Fetch user displayname
  useEffect(() => {
    const fetchUserDisplayName = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/user');
          if (response.ok) {
            const userData = await response.json();
            setUserDisplayName(userData.user.displayname || '');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserDisplayName();
  }, [session]);

  useEffect(() => {
    const claimQRCode = async () => {
      // Prevent multiple calls using ref (survives re-renders)
      if (claimAttemptRef.current) {
        return;
      }
      
      claimAttemptRef.current = true;
      
      try {
        const response = await fetch(`/api/qr/${params.uniqueId}`);
        const data = await response.json();

        if (response.ok) {
          setSuccess(true);
          setMessage(data.message);
          setPoints(data.points);
          
          // Only redirect to leaderboard on success after 3 seconds
          setTimeout(() => {
            const leaderboardUrl = userDisplayName 
              ? `/leaderboard?filter=${encodeURIComponent(userDisplayName)}`
              : '/leaderboard';
            router.push(leaderboardUrl);
          }, 6000);
        } else {
          setSuccess(false);
          setMessage(data.message || 'Failed to claim QR code');
          // Don't redirect on failure - leave user on error page
        }
      } catch (error) {
        console.error('Error claiming QR code:', error);
        setSuccess(false);
        setMessage('An error occurred while processing the QR code');
      } finally {
        setLoading(false);
      }
    };

    if (params.uniqueId && session && !claimAttemptRef.current) {
      claimQRCode();
    }
  }, [params.uniqueId, session, userDisplayName, router]);

  return (
    <div className="container mx-auto py-4 flex items-center justify-center min-h-[calc(100dvh-140px)]">
      <Card className="max-w-md w-full">
        <CardBody className="text-center py-10">
          {loading ? (
            <>
              <Spinner size="lg" color="success" />
              <p className="mt-4 text-lg">Processing QR code...</p>
            </>
          ) : (
            <>
              {success ? (
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              ) : (
                <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
              )}
              
              <h2 className={`text-2xl font-bold mb-2 ${success ? 'text-green-500' : 'text-red-500'}`}>
                {success ? 'Success!' : 'Error'}
              </h2>
              
              <p className="text-lg mb-4">{message}</p>
              
              {success && points !== 0 && (
                <p className={`text-xl font-semibold ${points > 0 ? 'text-primary' : 'text-danger'}`}>
                  {points > 0 ? '+' : ''}{points} 🥕
                </p>
              )}
              
              {success && (
                <p className="text-sm text-default-500 mt-4">
                  Redirecting to leaderboard...
                </p>
              )}
              
              {!success && !loading && (
                <p className="text-sm text-default-500 mt-4">
                  Keep trying and you'll get banned!
                </p>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}