import { getUser, User } from './user';

// DEFCON dates for the last 5 years (Thursday-Sunday) - All in UTC
export const DEFCON_DATES = [
  // DC33 2025 - Aug 7-10 (Thursday-Sunday) - PDT is UTC-7
  { year: 2025, start: new Date("2025-08-07T07:00:00.000Z"), end: new Date("2025-08-11T06:59:59.999Z") },
  // DC32 2024 - Aug 8-11 (Thursday-Sunday) - PDT is UTC-7
  { year: 2024, start: new Date("2024-08-08T07:00:00.000Z"), end: new Date("2024-08-12T06:59:59.999Z") },
  // DC31 2023 - Aug 10-13 (Thursday-Sunday) - PDT is UTC-7
  { year: 2023, start: new Date("2023-08-10T07:00:00.000Z"), end: new Date("2023-08-14T06:59:59.999Z") },
  // DC30 2022 - Aug 11-14 (Thursday-Sunday) - PDT is UTC-7
  { year: 2022, start: new Date("2022-08-11T07:00:00.000Z"), end: new Date("2022-08-15T06:59:59.999Z") },
  // DC29 2021 - Aug 5-8 (Thursday-Sunday) - PDT is UTC-7
  { year: 2021, start: new Date("2021-08-05T07:00:00.000Z"), end: new Date("2021-08-09T06:59:59.999Z") },
  // DC28 2020 - Aug 6-9 (Thursday-Sunday) - PDT is UTC-7
  { year: 2020, start: new Date("2020-08-06T07:00:00.000Z"), end: new Date("2020-08-10T06:59:59.999Z") },
];

// Use DC32 (2024) as default since DC33 (2025) is in the future
export const DC33_UNIX_START = Math.floor(DEFCON_DATES[1].start.getTime() / 1000); // DC32 2024
export const DC33_UNIX_END = Math.floor(DEFCON_DATES[1].end.getTime() / 1000);     // DC32 2024

// Las Vegas metro area geographic bounds (rough bounding box)
const LAS_VEGAS_BOUNDS = {
  // Covers Las Vegas metro including Henderson, Summerlin, North Las Vegas
  // and extends to areas people might visit (Red Rock, Lake Mead, etc.)
  north: 36.4,   // North Las Vegas / Aliante area
  south: 35.8,   // Henderson / Lake Las Vegas area  
  east: -114.7,  // Henderson / Lake Las Vegas / Boulder City direction
  west: -115.5   // Red Rock / Summerlin / Spring Valley area
};

/**
 * Checks if coordinates are within the Las Vegas metro area
 */
function isInLasVegasArea(lat: number, lng: number): boolean {
  return (
    lat >= LAS_VEGAS_BOUNDS.south &&
    lat <= LAS_VEGAS_BOUNDS.north &&
    lng >= LAS_VEGAS_BOUNDS.west &&
    lng <= LAS_VEGAS_BOUNDS.east
  );
}

/**
 * Filters activities to only those in Las Vegas area during DEFCON dates
 */
function filterDefconRelevantActivities(activities: StravaActivity[]): StravaActivity[] {
  return activities.filter(activity => {
    // Check if activity has location data
    const hasStartLocation = activity.start_latlng && activity.start_latlng.length === 2;
    const hasEndLocation = activity.end_latlng && activity.end_latlng.length === 2;
    
    if (!hasStartLocation && !hasEndLocation) {
      return false; // No location data
    }

    // Check if either start or end location is in Las Vegas area
    let inLasVegas = false;
    
    if (hasStartLocation) {
      const [startLat, startLng] = activity.start_latlng!;
      if (isInLasVegasArea(startLat, startLng)) {
        inLasVegas = true;
      }
    }
    
    if (!inLasVegas && hasEndLocation) {
      const [endLat, endLng] = activity.end_latlng!;
      if (isInLasVegasArea(endLat, endLng)) {
        inLasVegas = true;
      }
    }

    // Also check if activity date falls within any DEFCON period
    if (inLasVegas && activity.start_date) {
      const activityDate = new Date(activity.start_date);
      const activityTime = activityDate.getTime();
      
      // Check if activity falls within any DEFCON date range
      const duringDefcon = DEFCON_DATES.some(defcon => 
        activityTime >= defcon.start.getTime() && 
        activityTime <= defcon.end.getTime()
      );
      
      return duringDefcon;
    }

    return false;
  });
}

const fmtAsWeeksDaysHours = (seconds: number): string => 
  `${Math.floor(seconds / 604800) ? `${Math.floor(seconds / 604800)}wks` : ''}${Math.floor((seconds % 604800) / 86400) ? `${Math.floor((seconds % 604800) / 86400)}days` : ''}${Math.floor((seconds % 86400) / 3600)}hrs${Math.floor((seconds % 3600) / 60)}min${seconds % 60}seconds`;

export interface StravaActivity {
  resource_state?: number;
  athlete?: {
    id?: number;
    resource_state?: number;
  };
  name?: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  total_elevation_gain?: number;
  type?: string;
  sport_type?: string;
  workout_type?: number | null;
  id?: number;
  start_date?: string;
  start_date_local?: string;
  timezone?: string;
  utc_offset?: number;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  achievement_count?: number;
  kudos_count?: number;
  comment_count?: number;
  athlete_count?: number;
  photo_count?: number;
  map?: {
    id?: string;
    summary_polyline?: string;
    resource_state?: number;
  };
  trainer?: boolean;
  commute?: boolean;
  manual?: boolean;
  private?: boolean;
  visibility?: string;
  flagged?: boolean;
  gear_id?: string;
  start_latlng?: [number, number] | [];
  end_latlng?: [number, number] | [];
  average_speed?: number;
  max_speed?: number;
  average_cadence?: number;
  average_temp?: number;
  has_heartrate?: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  heartrate_opt_out?: boolean;
  display_hide_heartrate_option?: boolean;
  elev_high?: number;
  elev_low?: number;
  upload_id?: number;
  upload_id_str?: string;
  external_id?: string;
  from_accepted_tag?: boolean;
  pr_count?: number;
  total_photo_count?: number;
  has_kudoed?: boolean;
}

/**
 * Updates Strava tokens for a user if they're expired
 */
export async function refreshStravaTokensForUser(email: string): Promise<any> {
  const user = await getUser(email);
  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  const unixNow = Math.floor(Date.now() / 1000);
  return await updateStravaToken({ email, strava_account: user.strava_account, unixNow });
}

/**
 * Gets fresh Strava activities for a user within the specified date range
 */
export async function getStravaActivitiesForUser(
  email: string, 
  beforeUnix: number = DC33_UNIX_END, 
  afterUnix: number = DC33_UNIX_START
): Promise<StravaActivity[]> {
  // First ensure we have fresh tokens
  const updatedStravaAccount = await refreshStravaTokensForUser(email);
  
  if (!updatedStravaAccount) {
    throw new Error(`No valid Strava account for user: ${email}`);
  }

  // Fetch activities with fresh tokens
  const result = await fetchActivities({ 
    strava_account: updatedStravaAccount, 
    beforeUnix, 
    afterUnix 
  });

  if (result.error) {
    throw new Error(`Failed to fetch Strava activities: ${result.error}`);
  }

  return result.data as StravaActivity[];
}

/**
 * Gets all DEFCON-relevant activities across all 5 years for a user
 */
export async function getAllDefconActivitiesForUser(email: string): Promise<StravaActivity[]> {
  // First ensure we have fresh tokens
  const updatedStravaAccount = await refreshStravaTokensForUser(email);
  
  if (!updatedStravaAccount) {
    throw new Error(`No valid Strava account for user: ${email}`);
  }

  const allActivities: StravaActivity[] = [];
  
  // Fetch activities for each DEFCON year
  for (const defcon of DEFCON_DATES) {
    const beforeUnix = Math.floor(defcon.end.getTime() / 1000);
    const afterUnix = Math.floor(defcon.start.getTime() / 1000);
    
    console.log(`Fetching activities for DEFCON ${defcon.year}: ${defcon.start.toISOString()} to ${defcon.end.toISOString()}`);
    
    try {
      const result = await fetchActivities({ 
        strava_account: updatedStravaAccount, 
        beforeUnix, 
        afterUnix 
      });

      if (result.error) {
        console.warn(`Error fetching activities for DEFCON ${defcon.year}: ${result.error}`);
        continue;
      }

      const activities = result.data as StravaActivity[];
      allActivities.push(...activities);
      
      // Add a small delay between requests to be nice to Strava API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.warn(`Error fetching activities for DEFCON ${defcon.year}:`, error);
    }
  }

  // Filter to only Las Vegas area activities during DEFCON dates
  const defconRelevantActivities = filterDefconRelevantActivities(allActivities);
  
  console.log(`Found ${allActivities.length} total activities, ${defconRelevantActivities.length} DEFCON-relevant activities in Las Vegas area`);
  
  return defconRelevantActivities;
}

/**
 * Adds Strava activities to a user's strava_account map
 */
export async function addStravaActivitiesToUser(
  email: string, 
  activities: StravaActivity[]
): Promise<void> {
  const user = await getUser(email);
  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  // Merge new activities with existing ones (prevents duplicates, overwrites if same ID)
  const existingActivities = user.strava_account?.activities || {};
  const newActivitiesMap: Record<string, StravaActivity> = {};
  
  activities.forEach(activity => {
    if (activity.id) {
      newActivitiesMap[activity.id.toString()] = activity;
    }
  });

  // Merge existing and new activities
  const mergedActivities = {
    ...existingActivities,
    ...newActivitiesMap
  };

  // Update sync history (keep last 30 days worth)
  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  const existingSyncHistory = user.strava_account?.sync_history || [];
  const recentSyncHistory = existingSyncHistory.filter((syncTime: number) => syncTime >= thirtyDaysAgo);
  const updatedSyncHistory = [...recentSyncHistory, now];

  // Update user's strava_account with merged activities and sync history
  const updatedStravaAccount = {
    ...user.strava_account,
    activities: mergedActivities,
    last_activities_sync: now,
    sync_history: updatedSyncHistory
  };

  await User.update({
    email: email,
    id: user.id,
  }).set({
    strava_account: updatedStravaAccount
  }).go();
}

/**
 * Checks if user can sync (max 4 times per day)
 */
export async function canUserSync(email: string): Promise<{ canSync: boolean; nextAllowedSync?: number; syncCount?: number }> {
  const user = await getUser(email);
  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  const now = Date.now();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const syncHistory = user.strava_account?.sync_history || [];

  // Filter syncs from today
  const todaysSyncs = syncHistory.filter((syncTime: number) => syncTime >= todayStart);

  if (todaysSyncs.length >= 4) {
    const nextAllowedSync = todayStart + 24 * 60 * 60 * 1000; // Tomorrow
    return {
      canSync: false,
      nextAllowedSync,
      syncCount: todaysSyncs.length
    };
  }

  return {
    canSync: true,
    syncCount: todaysSyncs.length
  };
}

/**
 * Syncs Strava activities for a user (refresh tokens + fetch + store activities)
 */
export async function syncStravaActivitiesForUser(
  email: string,
  beforeUnix: number = DC33_UNIX_END,
  afterUnix: number = DC33_UNIX_START
): Promise<{ activitiesCount: number; activities: StravaActivity[]; newActivities: number; existingActivities: number }> {
  try {
    // Check rate limit first
    const syncCheck = await canUserSync(email);
    if (!syncCheck.canSync) {
      throw new Error(`Sync rate limit exceeded. You can sync ${4 - (syncCheck.syncCount || 0)} more times today. Next sync allowed: ${new Date(syncCheck.nextAllowedSync!).toLocaleString()}`);
    }

    // Get current user to check existing activities
    const user = await getUser(email);
    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    const existingActivities = user.strava_account?.activities || {};
    const existingCount = Object.keys(existingActivities).length;

    // Get fresh activities from Strava
    const activities = await getStravaActivitiesForUser(email, beforeUnix, afterUnix);
    
    // Count new vs existing activities
    let newActivities = 0;
    activities.forEach(activity => {
      if (activity.id && !existingActivities[activity.id.toString()]) {
        newActivities++;
      }
    });

    // Store activities in user record (this will merge with existing, overwriting duplicates)
    await addStravaActivitiesToUser(email, activities);
    
    console.log(`Synced ${activities.length} Strava activities for ${email} (${newActivities} new, ${activities.length - newActivities} existing)`);
    
    return {
      activitiesCount: activities.length,
      activities,
      newActivities,
      existingActivities: activities.length - newActivities
    };
  } catch (error) {
    console.error(`Error syncing Strava activities for ${email}:`, error);
    throw error;
  }
}

/**
 * Syncs ALL DEFCON-relevant Strava activities across 5 years (Las Vegas area only)
 */
export async function syncAllDefconActivitiesForUser(
  email: string
): Promise<{ activitiesCount: number; activities: StravaActivity[]; newActivities: number; existingActivities: number; yearsScanned: number[] }> {
  try {
    // Check rate limit first
    const syncCheck = await canUserSync(email);
    if (!syncCheck.canSync) {
      throw new Error(`Sync rate limit exceeded. You can sync ${4 - (syncCheck.syncCount || 0)} more times today. Next sync allowed: ${new Date(syncCheck.nextAllowedSync!).toLocaleString()}`);
    }

    // Get current user to check existing activities
    const user = await getUser(email);
    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    const existingActivities = user.strava_account?.activities || {};

    // Get all DEFCON-relevant activities (filtered for Las Vegas area)
    const activities = await getAllDefconActivitiesForUser(email);
    
    // Count new vs existing activities
    let newActivities = 0;
    activities.forEach(activity => {
      if (activity.id && !existingActivities[activity.id.toString()]) {
        newActivities++;
      }
    });

    // Store activities in user record (this will merge with existing, overwriting duplicates)
    await addStravaActivitiesToUser(email, activities);
    
    const yearsScanned = DEFCON_DATES.map(d => d.year);
    
    console.log(`Synced ${activities.length} DEFCON activities for ${email} across ${yearsScanned.length} years (${newActivities} new, ${activities.length - newActivities} existing)`);
    
    return {
      activitiesCount: activities.length,
      activities,
      newActivities,
      existingActivities: activities.length - newActivities,
      yearsScanned
    };
  } catch (error) {
    console.error(`Error syncing DEFCON activities for ${email}:`, error);
    throw error;
  }
}

/**
 * Gets stored Strava activities from a user's record
 */
export async function getStoredStravaActivitiesForUser(email: string): Promise<StravaActivity[]> {
  const user = await getUser(email);
  if (!user?.strava_account?.activities) {
    return [];
  }

  return Object.values(user.strava_account.activities);
}

// Internal functions (adapted from your sample)
async function updateStravaToken({ email, strava_account, unixNow }: { 
  email: string; 
  strava_account: any; 
  unixNow: number; 
}) {
  const clientId = process.env['AUTH_STRAVA_CLIENT_ID'] ?? process.env['STRAVA_CLIENT_ID'] as string;
  const clientSecret = process.env['AUTH_STRAVA_CLIENT_SECRET'] ?? process.env['STRAVA_CLIENT_SECRET'] as string;

  if (!strava_account) {
    console.log(`Not a Strava connected user: ${email}`);
    return null;
  } else if (!(clientId || clientSecret)) {
    console.error(`ERROR: No Strava OAuth credentials - missing client id+secret`);
    console.error(`ERROR: check the following ENV vars: AUTH_STRAVA_CLIENT_ID, AUTH_STRAVA_CLIENT_SECRET`);
    return null;
  }

  const expiredSecs = unixNow - Number(strava_account.expires_at);
  if (expiredSecs <= 0) { // Not expired yet!
    console.log(`INFO: ${email} still valid for ${fmtAsWeeksDaysHours(-expiredSecs)}`);
    return strava_account;
  }

  const resp = await fetchRefresh({ 
    refresh_token: strava_account.refresh_token, 
    clientId, 
    clientSecret 
  });
  
  if (resp['error']) {
    console.error(`Could not get Refresh Token: ${resp['error']}`);
    return null;
  }

  const updatedStravaAccount = {
    ...strava_account,
    access_token: resp.data.access_token,
    refresh_token: resp.data.refresh_token,
    expires_at: resp.data.expires_at,
    expires_in: resp.data.expires_in,
  };

  const user = await getUser(email);
  if (!user) {
    throw new Error(`User not found during token update: ${email}`);
  }

  await User.update({
    email,
    id: user.id,
  }).set({
    strava_account: updatedStravaAccount,
  }).go();

  console.log(`INFO: ${email} retrieved new API token from Strava`);

  return updatedStravaAccount;
}

async function fetchActivities({ strava_account, beforeUnix, afterUnix }: { strava_account: any; beforeUnix: number; afterUnix: number; }): Promise<{ data: any; error?: undefined; } | { error: unknown; data?: undefined; }> {
  try {
    const bearer = strava_account.access_token
    if (!bearer) {
      throw new Error(`ERROR: No access_token in strava_account`);
    }

    // Debug logging
    console.log(`Fetching Strava activities: after=${afterUnix} (${new Date(afterUnix * 1000).toISOString()}) before=${beforeUnix} (${new Date(beforeUnix * 1000).toISOString()})`);
    
    const url = `https://www.strava.com/api/v3/athlete/activities?before=${beforeUnix}&after=${afterUnix}&page=1&per_page=30`;
    console.log(`Strava API URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearer}`,
      },
    });
    if (!response.ok) {
      console.error(`Strava API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Error body: ${errorText}`);
      throw new Error(`${response.status}`);
    }
    const data = await response.json();
    return { data };

  } catch (error) {
    console.error(`Error refreshing Strava token: ${error}`);
    return { error };
  }

}

async function fetchRefresh({ 
  refresh_token, 
  clientId, 
  clientSecret 
}: { 
  refresh_token: string; 
  clientId: string; 
  clientSecret: string; 
}) {
  try {
    const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error(`Error refreshing Strava token: ${error}`);
    return { error };
  }
}