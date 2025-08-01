import { auth } from '@auth';
import { getAllUsersWithAccomplishmentCounts } from '@db/user';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const filter = searchParams.get('filter') || '';
    
    // Get all users with their accomplishment counts (this is the master list, already sorted)
    const allUsers = await getAllUsersWithAccomplishmentCounts();
    
    // Apply filter if provided (but keep original list for ranking)
    let filteredUsers = allUsers;
    if (filter) {
      filteredUsers = allUsers.filter(user => 
        user.displayname.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    // Calculate pagination on filtered results
    const total = filteredUsers.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(offset, offset + limit);

    // Return users without accomplishments (they'll be loaded dynamically)
    // Include global rank for each user based on original unfiltered list
    const leaderboardData = paginatedUsers.map((user, index) => {
      const globalRank = allUsers.findIndex(u => u.id === user.id) + 1; // Find rank in original full sorted list
      return {
        ...user,
        globalRank,
        accomplishmentCount: (user.totalAccomplishmentType?.activity || 0) + 
                            (user.totalAccomplishmentType?.social || 0) + 
                            (user.totalAccomplishmentType?.meshctf || 0)
      };
    });

    return NextResponse.json({
      users: leaderboardData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}