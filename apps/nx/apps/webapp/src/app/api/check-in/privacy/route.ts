import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@auth';
import { updateCheckInPrivacy } from '@db/checkin';

export async function PATCH(request: NextRequest) {
  const session = await auth();
  
  if (!session || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { checkInId, timestamp, isPrivate } = await request.json();

    if (!checkInId || !timestamp || typeof isPrivate !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update check-in privacy
    const updatedCheckIn = await updateCheckInPrivacy(
      session.user.email,
      checkInId,
      timestamp,
      isPrivate
    );

    return NextResponse.json({
      success: true,
      message: 'Privacy setting updated successfully',
      checkIn: updatedCheckIn
    });

  } catch (error) {
    console.error('Error updating check-in privacy:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'Check-in not found') {
        return NextResponse.json({ error: 'Check-in not found' }, { status: 404 });
      }
      if (error.message === 'User not found') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized to modify this check-in' }, { status: 403 });
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update privacy setting' },
      { status: 500 }
    );
  }
}