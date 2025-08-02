import { auth } from '@auth';
import { NextRequest, NextResponse } from 'next/server';
import { syncStravaActivitiesSmartForUser } from '@db/strava';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }

  try {
    // Smart sync: historical first time, then current year only
    const result = await syncStravaActivitiesSmartForUser(session.user.email);

    const responseData = {
      message: result.syncType === 'first-time' 
        ? 'All historical DEFCON activities synced successfully'
        : 'Current DEFCON activities synced successfully',
      activitiesCount: result.activitiesCount,
      newActivities: result.newActivities,
      existingActivities: result.existingActivities,
      accomplishmentsCreated: result.accomplishmentsCreated,
      syncType: result.syncType,
      syncTimestamp: Date.now(),
      ...(result.yearsScanned && { yearsScanned: result.yearsScanned })
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error syncing all DEFCON activities:', error);
    
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