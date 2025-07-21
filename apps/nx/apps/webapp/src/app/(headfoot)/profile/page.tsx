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
      
      <div className="">
        <UserDetails />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="mt-4">
          <MqttCredentials />
        </div>
        
        <div className="mt-4">
          <StravaConnection />
        </div>
      </div>
    </div>
  );
} 
