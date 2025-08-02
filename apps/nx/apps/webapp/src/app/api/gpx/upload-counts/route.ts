import { auth } from '@auth';
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@db/user';
import { MAX_UPLOADS_PER_DAY } from '../constants';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUser(session.user.email);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Get manual upload counts from user record
    const uploadCounts = user.manual_upload_counts || {};
    
    // Calculate remaining uploads for each DEFCON year and day
    const remainingUploads: Record<string, number> = {};
    const defconYears = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];
    const days = ['day1', 'day2', 'day3', 'day4'];
    
    defconYears.forEach(year => {
      days.forEach(day => {
        const key = `${year}_${day}`;
        const used = uploadCounts[key] || 0;
        remainingUploads[key] = Math.max(0, MAX_UPLOADS_PER_DAY - used);
      });
    });

    return NextResponse.json({
      uploadCounts,
      remainingUploads,
      maxPerDay: MAX_UPLOADS_PER_DAY
    });

  } catch (error) {
    console.error('Error fetching upload counts:', error);
    return NextResponse.json(
      { message: 'Failed to fetch upload counts' },
      { status: 500 }
    );
  }
}