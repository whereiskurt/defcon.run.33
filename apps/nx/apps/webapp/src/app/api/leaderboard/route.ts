import { auth } from '@auth';
import { getAllUsersWithAccomplishmentCounts, getUser, User, getTotalUserCount } from '@db/user';
import { getAllAccomplishmentsForLeaderboard } from '@db/accomplishment';
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Simple in-memory cache
interface LeaderboardCache {
  data: {
    allUsers: any[];
    allUsersMap: Map<string, any>;
    allAccomplishments: any[];
    totalDbCount: number;
  } | null;
  timestamp: number;
  isRefreshing: boolean;
}

const cache: LeaderboardCache = {
  data: null,
  timestamp: 0,
  isRefreshing: false
};

const CACHE_DURATION = 60 * 1000; // 60 seconds cache TTL
const CACHE_FILE_PATH = path.join(process.cwd(), 'tmp', 'leaderboard-cache.json');
const isDevelopment = process.env.NODE_ENV === 'development';

async function loadFromFileCache() {
  if (!isDevelopment) return null;
  
  try {
    const cacheData = await fs.readFile(CACHE_FILE_PATH, 'utf8');
    const parsed = JSON.parse(cacheData);
    
    // Convert allUsersMap back from object to Map
    const allUsersMap = new Map(Object.entries(parsed.data.allUsersMap));
    
    return {
      ...parsed,
      data: {
        ...parsed.data,
        allUsersMap
      }
    };
  } catch (error) {
    console.log('[Leaderboard Cache] No file cache found, will fetch from DB');
    return null;
  }
}

async function saveToFileCache(cacheData: LeaderboardCache) {
  if (!isDevelopment) return;
  
  try {
    // Ensure tmp directory exists
    const tmpDir = path.dirname(CACHE_FILE_PATH);
    await fs.mkdir(tmpDir, { recursive: true });
    
    // Convert Map to object for JSON serialization
    const serializable = {
      ...cacheData,
      data: cacheData.data ? {
        ...cacheData.data,
        allUsersMap: Object.fromEntries(cacheData.data.allUsersMap)
      } : null
    };
    
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(serializable, null, 2));
    console.log('[Leaderboard Cache] Saved cache to file');
  } catch (error) {
    console.error('[Leaderboard Cache] Error saving cache to file:', error);
  }
}

async function fetchLeaderboardData() {
  const allUsers = await getAllUsersWithAccomplishmentCounts();
  const totalDbCount = await getTotalUserCount();
  
  // Fetch all users using cursor pagination
  const allFullUsers: any[] = [];
  let cursor: string | undefined = undefined;
  
  do {
    const result: any = await User.scan.go({ 
      cursor,
      limit: 1000 // Process in batches of 1000
    });
    
    allFullUsers.push(...result.data);
    cursor = result.cursor;
    
    console.log(`Fetched ${result.data.length} users for leaderboard (total so far: ${allFullUsers.length})`);
    
  } while (cursor);
  
  console.log(`Total users fetched for leaderboard: ${allFullUsers.length}`);
  const allUsersMap = new Map(allFullUsers.map(user => [user.id, user]));
  const allAccomplishments = await getAllAccomplishmentsForLeaderboard();
  
  return {
    allUsers,
    allUsersMap,
    allAccomplishments,
    totalDbCount
  };
}

async function refreshCache() {
  if (cache.isRefreshing) return;
  
  cache.isRefreshing = true;
  try {
    const newData = await fetchLeaderboardData();
    cache.data = newData;
    cache.timestamp = Date.now();
    console.log(`[Leaderboard Cache] Cache refreshed at ${new Date(cache.timestamp).toISOString()}`);
    
    // Save to file in development
    if (isDevelopment) {
      await saveToFileCache(cache);
    }
  } catch (error) {
    console.error('[Leaderboard Cache] Error refreshing cache:', error);
  } finally {
    cache.isRefreshing = false;
  }
}

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
    
    // In development, try to load from file cache first
    if (isDevelopment && !cache.data) {
      const fileCache = await loadFromFileCache();
      if (fileCache) {
        cache.data = fileCache.data;
        cache.timestamp = fileCache.timestamp;
        console.log(`[Leaderboard Cache] Loaded from file cache, timestamp: ${new Date(cache.timestamp).toISOString()}`);
      }
    }
    
    // Check if cache needs refresh
    const now = Date.now();
    const cacheExpired = now - cache.timestamp > CACHE_DURATION;
    
    // If no cache data, fetch synchronously for first load
    if (!cache.data) {
      await refreshCache();
    } else if (cacheExpired && !cache.isRefreshing) {
      // In production, trigger background refresh but serve stale data
      // In development, only refresh if explicitly needed (file cache handles most cases)
      if (!isDevelopment) {
        refreshCache(); // Don't await - let it run in background
        console.log('[Leaderboard Cache] Serving stale data, background refresh triggered');
      }
    }
    
    // Use cached data
    if (!cache.data) {
      throw new Error('Failed to load leaderboard data');
    }
    
    const { allUsers, allUsersMap, allAccomplishments, totalDbCount } = cache.data;
    console.log(`[Leaderboard API] Using cached data from ${new Date(cache.timestamp).toISOString()}, Total users in DB: ${totalDbCount}, Users with accomplishments: ${allUsers.length}`);
    
    // Apply filter if provided (but keep original list for ranking)
    let filteredUsers = allUsers;
    if (filter) {
      const filterLower = filter.toLowerCase();
      
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