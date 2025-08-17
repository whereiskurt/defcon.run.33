import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@auth';
import { createCheckIn } from '@db/checkin';

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { samples, source, userAgent, isPrivate } = await request.json();

    // Create check-in using the new entity
    const checkIn = await createCheckIn(session.user.email, {
      samples,
      source,
      userAgent,
      isPrivate
    });

    return NextResponse.json({
      success: true,
      message: 'Check-in recorded successfully',
      checkIn: {
        date: new Date(checkIn.timestamp).toISOString(),
        coordinates: checkIn.averageCoordinates,
        accuracy: checkIn.bestAccuracy,
        samplesCollected: checkIn.pointsCount
      }
    });

  } catch (error) {
    console.error('Error processing check-in:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'Check-in quota exceeded') {
        return NextResponse.json({ 
          error: 'Check-in quota exceeded. You have reached the maximum number of check-ins allowed.' 
        }, { status: 429 });
      }
      if (error.message === 'Invalid samples data') {
        return NextResponse.json({ error: 'Invalid samples data' }, { status: 400 });
      }
      if (error.message === 'User not found') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to process check-in' },
      { status: 500 }
    );
  }
}