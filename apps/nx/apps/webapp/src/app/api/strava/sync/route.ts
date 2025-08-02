import { auth } from '@auth';
import { NextRequest, NextResponse } from 'next/server';
import { syncStravaActivitiesForUser, DC33_UNIX_START, DC33_UNIX_END } from '@db/strava';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }

  try {
    // Get optional date range from request body
    const body = await req.json().catch(() => ({}));
    const beforeUnix = body.beforeUnix || DC33_UNIX_END;
    const afterUnix = body.afterUnix || DC33_UNIX_START;

    // Sync Strava activities for the authenticated user
    const result = await syncStravaActivitiesForUser(
      session.user.email,
      beforeUnix,
      afterUnix
    );

    return NextResponse.json({
      message: 'Strava activities synced successfully',
      activitiesCount: result.activitiesCount,
      newActivities: result.newActivities,
      existingActivities: result.existingActivities,
      syncTimestamp: Date.now()
    });

  } catch (error) {
    console.error('Error syncing Strava activities:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('User not found')) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('No valid Strava account')) {
        return NextResponse.json(
          { message: 'No Strava account connected' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Failed to fetch Strava activities')) {
        return NextResponse.json(
          { message: 'Failed to fetch activities from Strava API' },
          { status: 502 }
        );
      }
      
      if (error.message.includes('Sync rate limit exceeded')) {
        return NextResponse.json(
          { message: error.message },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}