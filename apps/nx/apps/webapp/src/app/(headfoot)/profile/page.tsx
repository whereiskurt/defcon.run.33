'use server';

import { auth } from "@auth";
import MqttCredentials from "../../../components/profile/MqttCredentials";
import StravaConnection from "../../../components/profile/StravaConnection";
import UserDetails from "../../../components/profile/UserDetails";
import FlagSubmission from "../../../components/profile/FlagSubmission";
import { strapi } from '@components/cms/data';

export default async function Page() {
  const session = await auth();

  if (!session) {
    return <div>Please log in</div>;
  }

  const ghosts = await strapi('/ghosts?populate=*');
  console.log(JSON.stringify(ghosts.data));

  //const { handle, otp_url, flag, openai_gpt_url, sequence, gpx_filename, gpx_description } = raw.data;

  return (
    <div className="container mx-auto py-2">
      <div className="">
        <UserDetails />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="mt-2">
          <MqttCredentials />
        </div>
        
        <div className="mt-2">
          <StravaConnection />
        </div>
      </div>
      
      <div className="mt-2">
        <FlagSubmission ghosts={ghosts.data} />
      </div>
    </div>
  );
} 
