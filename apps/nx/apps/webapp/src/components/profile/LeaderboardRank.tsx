'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  CardFooter,
  Skeleton,
  Button,
} from '@heroui/react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface UserRankData {
  globalRank: number;
  accomplishmentCount: number;
  displayname: string;
}

export default function LeaderboardRank() {
  const { data: session, status } = useSession();
  const [rankData, setRankData] = useState<UserRankData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const fetchUserRank = async () => {
    if (!session?.user?.email) {
      setLoading(false);
      return;
    }

    try {
      // Fetch leaderboard data to find user's rank
      const response = await fetch('/api/leaderboard?limit=1000'); // Get all users to find rank
      const data = await response.json();
      
      if (response.ok && data.users) {
        // Find current user in the leaderboard
        const userRank = data.users.find((user: any) => user.email === session.user.email);
        
        if (userRank) {
          setRankData({
            globalRank: userRank.globalRank,
            accomplishmentCount: userRank.accomplishmentCount,
            displayname: userRank.displayname
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user rank:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'loading') {
      fetchUserRank();
    }
  }, [session, status]);

  // Listen for displayname update events
  useEffect(() => {
    const handleDisplaynameUpdate = () => {
      // Refetch rank data when displayname is updated
      setTimeout(() => {
        fetchUserRank();
      }, 1000); // Small delay to ensure backend is updated
    };

    window.addEventListener('displaynameUpdated', handleDisplaynameUpdate);
    
    return () => {
      window.removeEventListener('displaynameUpdated', handleDisplaynameUpdate);
    };
  }, [session?.user?.email]);

  if (status === 'loading' || loading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex justify-between items-center pb-2">
          <div className="flex items-center gap-2">
            <div className="text-2xl">🥕</div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold">Leaderboard Ranking</h3>
              <p className="text-sm text-default-500">Your position on the leaderboard</p>
            </div>
          </div>
          <Button 
            isIconOnly 
            variant="light" 
            size="sm"
            disabled
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </CardHeader>
        <Divider />
      </Card>
    );
  }

  const displayRank = rankData?.globalRank && rankData.accomplishmentCount && rankData.accomplishmentCount > 0 
    ? `#${rankData.globalRank}` 
    : 'No Rank';

  const userDisplayName = rankData?.displayname || session?.user?.name || 'user';

  return (
    <Card className="w-full">
      <CardHeader className="flex justify-between items-center pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <div className="text-2xl">🥕</div>
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold">Leaderboard Ranking</h3>
            <p className="text-sm text-default-500">Your position on the leaderboard</p>
          </div>
        </div>
        <Button 
          isIconOnly 
          variant="light" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CardHeader>
      <Divider />
      {isExpanded && (
        <>
          <CardBody className="text-center pt-5">
            <Link 
              href={`/leaderboard?filter=${encodeURIComponent(userDisplayName)}`}
              className="block hover:opacity-80 transition-opacity"
            >
              <div className="text-5xl font-bold text-primary mb-2">
                {displayRank}
              </div>
              <p className="text-default-500 text-sm">
                {rankData?.accomplishmentCount && rankData.accomplishmentCount > 0 
                  ? `Based on ${rankData.accomplishmentCount} accomplishment${rankData.accomplishmentCount !== 1 ? 's' : ''}`
                  : 'Run/Walk/Ruck, CTF Flags, Social Events'
                }
              </p>
              <p className="text-primary text-xs">
                Click here to view full leaderboard
              </p>
            </Link>
          </CardBody>
          <Divider className="mt-2" />
          
          <CardFooter>
            <p className="text-small text-default-500">
              Daily accomplishments for run/walk/ruck activities, Meshtastic CTF flags, and for coming out to social events.
            </p>
          </CardFooter>
        </>
      )}
    </Card>
  );
}