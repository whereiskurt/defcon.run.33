import { auth } from '@auth';
import { updateDisplayname, getUser, updateUser } from '@db/user';
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

    if (trimmedDisplayname.length > 16) {
      return NextResponse.json(
        { message: 'Display name must be 16 characters or less' },
        { status: 400 }
      );
    }

    // Check if user has at least 2 points (social flag unlock)
    const user = await getUser(session.user.email);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    if ((user.totalPoints || 0) < 2) {
      return NextResponse.json(
        { message: 'You need at least 2 points to unlock display name changes' },
        { status: 403 }
      );
    }

    // Check daily quota (after social flag is unlocked)
    const today = new Date().toISOString().split('T')[0];
    const quota = user.quota || {};
    const resetDate = quota.displaynameChangesResetDate || '';
    let remainingChanges = quota.displaynameChanges ?? 3;

    // Reset quota if it's a new day
    if (resetDate !== today) {
      remainingChanges = 3;
      await updateUser({
        email: session.user.email,
        quota: {
          ...quota,
          displaynameChanges: 2, // Will be decremented to 2 after this change
          displaynameChangesResetDate: today
        }
      });
    } else if (remainingChanges <= 0) {
      return NextResponse.json(
        { message: 'You have reached your daily limit of 3 display name changes. Please try again tomorrow.' },
        { status: 429 }
      );
    }

    const updatedUser = await updateDisplayname(session.user.email, trimmedDisplayname);
    
    if (!updatedUser) {
      return NextResponse.json(
        { message: 'Failed to update display name' },
        { status: 500 }
      );
    }

    // Decrement the quota after successful update
    if (resetDate === today) {
      await updateUser({
        email: session.user.email,
        quota: {
          ...quota,
          displaynameChanges: remainingChanges - 1,
          displaynameChangesResetDate: today
        }
      });
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
        user: safeUserData,
        remainingChangesToday: resetDate === today ? remainingChanges - 1 : 2
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