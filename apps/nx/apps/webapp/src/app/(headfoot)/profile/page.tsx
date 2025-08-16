'use server';

import { auth } from "@auth";
import { getUserById } from "@db/user";
import MqttCredentials from "../../../components/profile/MqttCredentials";
import StravaConnection from "../../../components/profile/StravaConnection";
import UserDetails from "../../../components/profile/UserDetails";
import LeaderboardRank from "../../../components/profile/LeaderboardRank";
import QuotaDisplay from "../../../components/profile/QuotaDisplay";
import CheckInDisplayClient from "../../../components/profile/CheckInDisplayClient";

export default async function Page() {
  const session = await auth();

  if (!session) {
    return <div>Please log in</div>;
  }

  // Get user data including check-ins
  const user = await getUserById(session.user.email!);

  return (
    <div className="container mx-auto py-4 space-y-4">
      {/* Row 1: User Details - Display name, email, user type all in one row */}
      <UserDetails />
      
      {/* Row 2: MQTT Credentials + Global Ranking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MqttCredentials />
        <LeaderboardRank />
      </div>
      
      {/* Row 4: Check-Ins Display - Full width */}
      <CheckInDisplayClient 
        checkIns={user?.checkIns || []} 
        remainingQuota={user?.quota?.checkIns ?? 50}
        userEmail={session.user.email!}
      />
            
      {/* Row 3: Strava Connection + Quota Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StravaConnection />
        <QuotaDisplay />
      </div>

    </div>
  );
} 
