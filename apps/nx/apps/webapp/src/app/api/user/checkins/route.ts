import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@auth';
import { getUser } from '@db/user';
import { getCheckInsByUser } from '@db/checkin';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user to get their userId
    const user = await getUser(session.user.email);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor') || undefined;

    // Fetch check-ins for the user
    const result = await getCheckInsByUser(user.id, limit, cursor);

    return NextResponse.json({
      success: true,
      checkIns: result.data,
      cursor: result.cursor,
      hasMore: !!result.cursor
    });

  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check-ins' },
      { status: 500 }
    );
  }
}