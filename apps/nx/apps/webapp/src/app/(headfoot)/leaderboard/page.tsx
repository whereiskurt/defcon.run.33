'use server';

import { auth } from '@auth';
import LeaderboardTable from '../../../components/leaderboard/LeaderboardTable';
import { Heading, Lead } from '@components/text-effects/Common';

export default async function Page() {
  const session = await auth();

  if (!session) {
    return <div>Please log in</div>;
  }

  return (
    <>
      <Heading className="mb-2">Leaderboard 🥕</Heading>
      <Lead className="mb-2">Who's getting all the carrots?</Lead>
      <div className="container mx-auto">
        <LeaderboardTable />
      </div>
    </>
  );
}
