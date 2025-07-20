'use server';

import { auth } from "@auth";
import MqttCredentials from "../../../components/profile/MqttCredentials";
import StravaConnection from "../../../components/profile/StravaConnection";
import UserDetails from "../../../components/profile/UserDetails";

export default async function Page() {
  const session = await auth();

  if (!session) {
    return <div>Please log in</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      
      <div className="mb-6">
        <UserDetails />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-4">Your MQTT Credentials</h2>
          <MqttCredentials />
        </div>
        
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-4">Strava Integration</h2>
          <StravaConnection />
        </div>
      </div>
    </div>
  );
} 
