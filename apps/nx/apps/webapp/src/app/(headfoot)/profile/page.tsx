'use server';

import { auth } from "@auth";
import MqttCredentials from "../../../components/profile/MqttCredentials";
import StravaConnection from "../../../components/profile/StravaConnection";
import UserDetails from "../../../components/profile/UserDetails";
import LeaderboardRank from "../../../components/profile/LeaderboardRank";

export default async function Page() {
  const session = await auth();

  if (!session) {
    return <div>Please log in</div>;
  }


  return (
    <div className="container mx-auto py-4 space-y-4">
      {/* Row 1: User Details - Display name, email, user type all in one row */}
      <UserDetails />
      
      {/* Row 2: MQTT Credentials + Global Ranking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MqttCredentials />
        <LeaderboardRank />
      </div>
      
      {/* Row 3: Strava Connection - full width */}
      <StravaConnection />
      
    </div>
  );
} 
