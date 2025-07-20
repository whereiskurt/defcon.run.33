import { auth } from '@auth';
import { getUser } from '@db/user';
import { NextRequest, NextResponse } from 'next/server';
import { getCachedItem, setCachedItem } from '@db/cache';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }

  let user = getCachedItem(session.user.email, 'users');
  if (!user) {
    user = await getUser(session.user.email);
    if (user) {
      setCachedItem(session.user.email, user, 'users');
    }
  }

  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  // Strip out sensitive fields
  const {
    id,
    rsaprivSHA,
    seed,
    github_profile,
    discord_profile,
    strava_profile,
    strava_account,

    // Add other sensitive fields here if needed
    ...safeUserData
  } = user;

  return NextResponse.json(
    { message: 'User Fetched.', user: safeUserData },
    { status: 200 }
  );
}
