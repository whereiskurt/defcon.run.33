'use server';

import { auth } from '@auth';
import LeaderboardTable from '../../../components/leaderboard/LeaderboardTable';
import { Heading, Lead } from '@components/text-effects/Common';
import { strapi } from '@components/cms/data';

export default async function Page() {
  const session = await auth();

  if (!session) {
    return <div>Please log in</div>;
  }

  const ghosts = await strapi('/ghosts?populate=*');

  return (
    <div className="relative">
      <Heading className="mb-2 px-1 text-center relative z-10">🥕 Leaderboard 🥕</Heading>
      <div className="container mx-auto relative -mt-8">
        <LeaderboardTable ghosts={ghosts.data} />
      </div>
    </div>
  );
}
