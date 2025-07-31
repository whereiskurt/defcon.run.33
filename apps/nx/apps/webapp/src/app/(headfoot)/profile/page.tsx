'use server';

import { auth } from "@auth";
import MqttCredentials from "../../../components/profile/MqttCredentials";
import StravaConnection from "../../../components/profile/StravaConnection";
import UserDetails from "../../../components/profile/UserDetails";
import FlagSubmission from "../../../components/profile/FlagSubmission";
import LeaderboardRank from "../../../components/profile/LeaderboardRank";
import { strapi } from '@components/cms/data';

export default async function Page() {
  const session = await auth();

  if (!session) {
    return <div>Please log in</div>;
  }

  const ghosts = await strapi('/ghosts?populate=*');

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
      
      {/* Row 4: Flag Submission */}
      <FlagSubmission ghosts={ghosts.data} />
    </div>
  );
} 
