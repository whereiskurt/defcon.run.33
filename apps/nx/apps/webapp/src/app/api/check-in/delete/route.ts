import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@auth';
import { deleteCheckIn } from '@db/checkin';

export async function DELETE(request: NextRequest) {
  const session = await auth();
  
  if (!session || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { checkInId, timestamp } = await request.json();

    if (!checkInId || !timestamp) {
      return NextResponse.json({ error: 'Missing checkInId or timestamp' }, { status: 400 });
    }

    // Delete check-in (security handled in deleteCheckIn function)
    const result = await deleteCheckIn(session.user.email, checkInId, timestamp);

    return NextResponse.json({
      success: true,
      message: 'Check-in deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting check-in:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'Check-in not found') {
        return NextResponse.json({ 
          error: 'Check-in not found or you do not have permission to delete it' 
        }, { status: 404 });
      }
      if (error.message === 'User not found') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ 
      error: 'Failed to delete check-in' 
    }, { status: 500 });
  }
}