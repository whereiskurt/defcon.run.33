import { auth } from '@auth';
import { getAccomplishmentsByUser } from '@db/accomplishment';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session || !session.user.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = await params;
    
    // Get accomplishments for the specific user
    const accomplishments = await getAccomplishmentsByUser(userId);
    
    // Format the response
    const formattedAccomplishments = accomplishments.map(accomplishment => ({
      type: accomplishment.type,
      name: accomplishment.name,
      description: accomplishment.description,
      completedAt: accomplishment.completedAt,
      year: accomplishment.year,
      metadata: accomplishment.metadata
    }));

    return NextResponse.json(formattedAccomplishments, { status: 200 });
  } catch (error) {
    console.error('Error fetching user accomplishments:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}