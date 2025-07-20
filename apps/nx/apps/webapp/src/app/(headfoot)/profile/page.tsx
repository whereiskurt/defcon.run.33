'use server';

import { auth } from "@auth";
import MqttCredentials from "../../../components/profile/MqttCredentials";

export default async function Page() {
  const session = await auth();

  if (!session) {
    return <div>Please log in</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <p className="mb-4">Welcome, {session.user.email}</p>
      
      <div className="mt-8">
        <MqttCredentials />
      </div>
    </div>
  );
} 
