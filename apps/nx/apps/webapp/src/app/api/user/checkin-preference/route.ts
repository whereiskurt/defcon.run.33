import { auth } from '@auth';
import { getUser, updateUser } from '@db/user';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }

  try {
    const { checkin_preference } = await req.json();
    
    if (!checkin_preference || !['public', 'private'].includes(checkin_preference)) {
      return NextResponse.json(
        { message: 'Check-in preference must be either "public" or "private"' },
        { status: 400 }
      );
    }

    // Get current user to check if they exist
    const user = await getUser(session.user.email);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Update the user's check-in preference
    const updatedUser = await updateUser({
      email: session.user.email,
      checkin_preference: checkin_preference
    });
    
    if (!updatedUser) {
      return NextResponse.json(
        { message: 'Failed to update check-in preference' },
        { status: 500 }
      );
    }

    // Strip out sensitive fields before returning
    const {
      id,
      rsaprivSHA,
      seed,
      github_profile,
      discord_profile,
      strava_profile,
      strava_account,
      ...safeUserData
    } = updatedUser;

    return NextResponse.json(
      { 
        message: 'Check-in preference updated successfully', 
        user: safeUserData
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating check-in preference:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}