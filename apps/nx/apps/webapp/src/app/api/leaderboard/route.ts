import { auth } from '@auth';
import { getAllUsersWithAccomplishmentCounts, getUser, User } from '@db/user';
import { getAllAccomplishmentsForLeaderboard } from '@db/accomplishment';
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
    
    // Get current user for highlighting
    const currentUser = await getUser(session.user.email);
    
    // Get all users with their accomplishment counts (this is the master list, already sorted)
    const allUsers = await getAllUsersWithAccomplishmentCounts();
    
    // Get full user data (includes mqtt_usertype) for building lookup map
    const fullUsersResult = await User.scan.go();
    const allUsersMap = new Map(fullUsersResult.data.map(user => [user.id, user]));
    
    // Apply filter if provided (but keep original list for ranking)
    let filteredUsers = allUsers;
    if (filter) {
      const filterLower = filter.toLowerCase();
      
      // Get all accomplishments for more comprehensive search
      const allAccomplishments = await getAllAccomplishmentsForLeaderboard();
      
      filteredUsers = allUsers.filter(user => {
        // Search for specific mqtt_usertype
        if (filterLower === 'wildhare') {
          const fullUser = allUsersMap.get(user.id);
          return fullUser?.mqtt_usertype === 'wildhare';
        }
        
        if (filterLower === 'og') {
          const fullUser = allUsersMap.get(user.id);
          return fullUser?.mqtt_usertype === 'og';
        }
        
        // Search in display name
        if (user.displayname.toLowerCase().includes(filterLower)) {
          return true;
        }
        
        // Search in user's accomplishments (names and descriptions)
        const userAccomplishments = allAccomplishments.filter(acc => acc.userId === user.id);
        return userAccomplishments.some(acc => 
          acc.name.toLowerCase().includes(filterLower) || 
          (acc.description && acc.description.toLowerCase().includes(filterLower))
        );
      });
    }
    
    // Calculate pagination on filtered results
    const total = filteredUsers.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(offset, offset + limit);
    
    // Prepare user data with mqtt_usertype from the map (no additional queries needed)
    const usersWithMqttType = paginatedUsers.map((user) => {
      const fullUser = allUsersMap.get(user.id);
      const globalRank = allUsers.findIndex(u => u.id === user.id) + 1; // Find rank in original full sorted list
      return {
        ...user,
        globalRank,
        accomplishmentCount: (user.totalAccomplishmentType?.activity || 0) + 
                            (user.totalAccomplishmentType?.social || 0) + 
                            (user.totalAccomplishmentType?.meshctf || 0),
        totalPoints: user.totalPoints || 0,
        mqtt_usertype: fullUser?.mqtt_usertype || 'rabbit'
      };
    });

    // Get current user data for the chip
    let currentUserData = null;
    if (currentUser?.id) {
      const currentUserFromList = allUsers.find(user => user.id === currentUser.id);
      if (currentUserFromList) {
        const fullCurrentUser = allUsersMap.get(currentUser.id);
        currentUserData = {
          ...currentUserFromList,
          mqtt_usertype: fullCurrentUser?.mqtt_usertype || 'rabbit'
        };
      }
    }

    return NextResponse.json({
      users: usersWithMqttType,
      currentUserId: currentUser?.id,
      currentUser: currentUserData,
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