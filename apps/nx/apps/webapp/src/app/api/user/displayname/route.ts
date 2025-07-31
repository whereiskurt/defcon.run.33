import { auth } from '@auth';
import { updateDisplayname } from '@db/user';
import { NextRequest, NextResponse } from 'next/server';
import { invalidateCache } from '@db/cache';

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }

  try {
    const { displayname } = await req.json();
    
    if (!displayname || typeof displayname !== 'string') {
      return NextResponse.json(
        { message: 'Display name is required and must be a string' },
        { status: 400 }
      );
    }

    const trimmedDisplayname = displayname.trim();
    if (trimmedDisplayname.length === 0) {
      return NextResponse.json(
        { message: 'Display name cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedDisplayname.length > 50) {
      return NextResponse.json(
        { message: 'Display name must be 50 characters or less' },
        { status: 400 }
      );
    }

    const updatedUser = await updateDisplayname(session.user.email, trimmedDisplayname);
    
    if (!updatedUser) {
      return NextResponse.json(
        { message: 'Failed to update display name' },
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
        message: 'Display name updated successfully', 
        user: safeUserData 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating display name:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}