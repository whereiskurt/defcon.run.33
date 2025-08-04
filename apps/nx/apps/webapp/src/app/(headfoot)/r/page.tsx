'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardBody, Spinner } from '@heroui/react';
import { CheckCircle, XCircle } from 'lucide-react';

export default function RabbitQRPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('');
  const claimAttemptRef = useRef(false);

  // Get the hash from query parameter
  const hash = searchParams.get('h');

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
    const connectWithRabbit = async () => {
      // Prevent multiple calls using ref (survives re-renders)
      if (claimAttemptRef.current) {
        return;
      }
      
      claimAttemptRef.current = true;
      
      if (!hash) {
        setSuccess(false);
        setMessage('Invalid QR code - no hash provided');
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/r?h=${encodeURIComponent(hash)}`);
        const data = await response.json();

        if (response.ok) {
          setSuccess(true);
          setMessage(data.message);
          
          // Redirect to leaderboard after 6 seconds
          setTimeout(() => {
            const leaderboardUrl = userDisplayName 
              ? `/leaderboard?filter=${encodeURIComponent(userDisplayName)}`
              : '/leaderboard';
            router.push(leaderboardUrl);
          }, 6000);
        } else {
          setSuccess(false);
          setMessage(data.message || 'Failed to connect with rabbit');
        }
      } catch (error) {
        console.error('Error processing rabbit QR code:', error);
        setSuccess(false);
        setMessage('An error occurred while processing the QR code');
      } finally {
        setLoading(false);
      }
    };

    if (hash && session && !claimAttemptRef.current) {
      connectWithRabbit();
    } else if (!hash) {
      setSuccess(false);
      setMessage('Invalid QR code - no hash provided');
      setLoading(false);
    }
  }, [hash, session, userDisplayName, router]);

  if (!session) {
    return <div></div>;
  }

  return (
    <div className="container mx-auto py-4 flex items-center justify-center min-h-[calc(100dvh-140px)]">
      <Card className="max-w-md w-full">
        <CardBody className="text-center py-10">
          {loading ? (
            <>
              <Spinner size="lg" color="success" />
              <p className="mt-4 text-lg">Connecting with rabbit...</p>
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
              
              {success && (
                <>
                  <p className="text-xl font-semibold text-primary mb-2">
                    🐰🤝🐰
                  </p>
                  <p className="text-sm text-default-500 mt-4">
                    Redirecting to leaderboard...
                  </p>
                </>
              )}
              
              {!success && !loading && (
                <>
                  {message.includes('cannot scan your own') && (
                    <p className="text-xl mb-2">🐰❌🐰</p>
                  )}
                  <p className="text-sm text-default-500 mt-4">
                    {message.includes('cannot scan your own') 
                      ? 'Share your QR code with others to connect!' 
                      : message.includes('already connected')
                      ? 'Find new rabbits to connect with!'
                      : 'Please scan a valid rabbit QR code'}
                  </p>
                </>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}