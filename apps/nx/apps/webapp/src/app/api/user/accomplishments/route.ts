import { auth } from '@auth';
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@db/user';
import { getAccomplishmentsByType, getAccomplishmentsByUser } from '@db/accomplishment';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get user details
    const user = await getUser(session.user.email);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Get the type parameter from query string
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    let accomplishments;
    if (type && ['activity', 'social', 'meshctf'].includes(type)) {
      // Get accomplishments of specific type
      accomplishments = await getAccomplishmentsByType(user.id, type as 'activity' | 'social' | 'meshctf');
    } else {
      // Get all accomplishments
      accomplishments = await getAccomplishmentsByUser(user.id);
    }

    return NextResponse.json({
      accomplishments,
      count: accomplishments.length,
      type: type || 'all'
    });
  } catch (error) {
    console.error('Error fetching user accomplishments:', error);
    return NextResponse.json(
      { message: 'Failed to fetch accomplishments' },
      { status: 500 }
    );
  }
}