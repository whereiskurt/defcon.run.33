import { getUser, User } from './user';
import { createStravaAccomplishment } from './accomplishment';
import { invalidateCache } from './cache';

// DEFCON dates for the last 8 years (Monday before to Monday after) - Full days in PDT/PST
export const DEFCON_DATES = [
  // DC33 2025 - Aug 7-10 (Thursday-Sunday) - Monday Aug 4 to Monday Aug 11
  { year: 2025, start: new Date("2025-08-04T00:00:00-07:00"), end: new Date("2025-08-11T23:59:59-07:00") },
  // DC32 2024 - Aug 8-11 (Thursday-Sunday) - Monday Aug 5 to Monday Aug 12  
  { year: 2024, start: new Date("2024-08-05T00:00:00-07:00"), end: new Date("2024-08-12T23:59:59-07:00") },
  // DC31 2023 - Aug 10-13 (Thursday-Sunday) - Monday Aug 7 to Monday Aug 14
  { year: 2023, start: new Date("2023-08-07T00:00:00-07:00"), end: new Date("2023-08-14T23:59:59-07:00") },
  // DC30 2022 - Aug 11-14 (Thursday-Sunday) - Monday Aug 8 to Monday Aug 15
  { year: 2022, start: new Date("2022-08-08T00:00:00-07:00"), end: new Date("2022-08-15T23:59:59-07:00") },
  // DC29 2021 - Aug 5-8 (Thursday-Sunday) - Monday Aug 2 to Monday Aug 9
  { year: 2021, start: new Date("2021-08-02T00:00:00-07:00"), end: new Date("2021-08-09T23:59:59-07:00") },
  // DC28 2020 - Aug 6-9 (Thursday-Sunday) - Monday Aug 3 to Monday Aug 10 (Virtual + text matching)
  { year: 2020, start: new Date("2020-08-03T00:00:00-07:00"), end: new Date("2020-08-10T23:59:59-07:00") },
  // DC27 2019 - Aug 8-11 (Thursday-Sunday) - Monday Aug 5 to Monday Aug 12
  { year: 2019, start: new Date("2019-08-05T00:00:00-07:00"), end: new Date("2019-08-12T23:59:59-07:00") },
  // DC26 2018 - Aug 9-12 (Thursday-Sunday) - Monday Aug 6 to Monday Aug 13
  { year: 2018, start: new Date("2018-08-06T00:00:00-07:00"), end: new Date("2018-08-13T23:59:59-07:00") },
];

// Use DC33 (2025) as default for current year
export const DC33_UNIX_START = Math.floor(DEFCON_DATES[0].start.getTime() / 1000); // DC33 2025
export const DC33_UNIX_END = Math.floor(DEFCON_DATES[0].end.getTime() / 1000);     // DC33 2025

// Nevada state geographic bounds (entire state)
const NEVADA_BOUNDS = {
  // Entire state of Nevada boundaries
  north: 42.0,   // Northern border with Idaho/Oregon
  south: 35.0,   // Southern border with Arizona/California  
  east: -114.0,  // Eastern border with Utah/Arizona
  west: -120.01  // Western border with California (slightly extended for Lake Tahoe)
};

/**
 * Checks if coordinates are within Nevada state boundaries
 */
function isInNevadaArea(lat: number, lng: number): boolean {
  return (
    lat >= NEVADA_BOUNDS.south &&
    lat <= NEVADA_BOUNDS.north &&
    lng >= NEVADA_BOUNDS.west &&
    lng <= NEVADA_BOUNDS.east
  );
}

/**
 * Checks if activity name contains DEFCON-related terms (for virtual years like 2020)
 */
function hasDefconInName(activityName: string): boolean {
  if (!activityName) return false;
  
  const defconPatterns = [
    /defcon/i,
    /def\s*con/i,
    /dc\d{2}/i,
    /def-con/i
  ];
  
  return defconPatterns.some(pattern => pattern.test(activityName));
}

/**
 * Filters activities to only those in Nevada during DEFCON dates
 */
function filterDefconRelevantActivities(activities: StravaActivity[]): StravaActivity[] {
  console.log(`Starting filter: ${activities.length} total activities`);
  
  let noLocationCount = 0;
  let outsideNevadaCount = 0;
  let outsideDefconDatesCount = 0;
  let textMatchCount = 0;
  let passedFilterCount = 0;

  const filtered = activities.filter((activity, index) => {
    const activityInfo = `"${activity.name || 'Unnamed'}" on ${activity.start_date || 'unknown date'}`;
    
    // Special handling for 2020 (virtual DEFCON) - text matching anywhere
    if (activity.start_date) {
      const activityDate = new Date(activity.start_date);
      const activityYear = activityDate.getFullYear();
      
      if (activityYear === 2020 && hasDefconInName(activity.name || '')) {
        textMatchCount++;
        passedFilterCount++;
        console.log(`✅ ${activityInfo} - DC2020 Virtual (DEFCON text match)`);
        return true;
      }
    }
    
    // For all other years, require Nevada location
    const hasStartLocation = activity.start_latlng && activity.start_latlng.length === 2;
    const hasEndLocation = activity.end_latlng && activity.end_latlng.length === 2;
    
    if (!hasStartLocation && !hasEndLocation) {
      noLocationCount++;
      console.log(`❌ ${activityInfo} - No GPS coordinates available`);
      return false;
    }

    // Check if either start or end location is in Nevada
    let inNevada = false;
    let locationDetails = '';
    
    if (hasStartLocation && activity.start_latlng && activity.start_latlng.length === 2) {
      const [startLat, startLng] = activity.start_latlng;
      if (startLat !== undefined && startLng !== undefined) {
        locationDetails += `start: ${startLat.toFixed(4)}, ${startLng.toFixed(4)}`;
        if (isInNevadaArea(startLat, startLng)) {
          inNevada = true;
        }
      }
    }
    
    if (!inNevada && hasEndLocation && activity.end_latlng && activity.end_latlng.length === 2) {
      const [endLat, endLng] = activity.end_latlng;
      if (endLat !== undefined && endLng !== undefined) {
        locationDetails += `${locationDetails ? ' ' : ''}end: ${endLat.toFixed(4)}, ${endLng.toFixed(4)}`;
        if (isInNevadaArea(endLat, endLng)) {
          inNevada = true;
        }
      }
    }

    if (!inNevada) {
      outsideNevadaCount++;
      console.log(`❌ ${activityInfo} - Outside Nevada (${locationDetails})`);
      return false;
    }

    // Check if activity date falls within any DEFCON period
    if (activity.start_date) {
      const activityDate = new Date(activity.start_date);
      const activityTime = activityDate.getTime();
      
      // Check if activity falls within any DEFCON date range
      const matchingDefcon = DEFCON_DATES.find(defcon => 
        activityTime >= defcon.start.getTime() && 
        activityTime <= defcon.end.getTime()
      );
      
      if (matchingDefcon) {
        passedFilterCount++;
        console.log(`✅ ${activityInfo} - DC${matchingDefcon.year} (${locationDetails})`);
        return true;
      } else {
        outsideDefconDatesCount++;
        console.log(`❌ ${activityInfo} - Date outside all DEFCON periods (${locationDetails})`);
        return false;
      }
    } else {
      console.log(`❌ ${activityInfo} - No start date available`);
      return false;
    }
  });

  console.log(`\n📊 Filter results:`);
  console.log(`  - ❌ No location data: ${noLocationCount}`);
  console.log(`  - ❌ Outside Nevada: ${outsideNevadaCount}`);
  console.log(`  - ❌ Outside DEFCON dates: ${outsideDefconDatesCount}`);
  console.log(`  - ✅ 2020 DEFCON text matches: ${textMatchCount}`);
  console.log(`  - ✅ Passed filter: ${passedFilterCount}`);
  console.log(`\n🗺️  Nevada bounds: N:${NEVADA_BOUNDS.north}° S:${NEVADA_BOUNDS.south}° E:${NEVADA_BOUNDS.east}° W:${NEVADA_BOUNDS.west}°`);

  return filtered;
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
      const result = await fetchAllActivitiesInRange({ 
        strava_account: updatedStravaAccount, 
        beforeUnix, 
        afterUnix 
      });

      if (result.error) {
        console.warn(`Error fetching activities for DEFCON ${defcon.year}: ${result.error}`);
        continue;
      }

      const activities = result.data as StravaActivity[];
      console.log(`DEFCON ${defcon.year}: Found ${activities.length} total activities before filtering`);
      allActivities.push(...activities);
      
      // Add a delay between years to be nice to Strava API
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.warn(`Error fetching activities for DEFCON ${defcon.year}:`, error);
    }
  }

  // Filter to only Nevada activities during DEFCON dates
  const defconRelevantActivities = filterDefconRelevantActivities(allActivities);
  
  console.log(`Found ${allActivities.length} total activities, ${defconRelevantActivities.length} DEFCON-relevant activities in Nevada`);
  
  return defconRelevantActivities;
}

/**
 * Adds Strava activities to a user's strava_account map
 */
export async function addStravaActivitiesToUser(
  email: string, 
  activities: StravaActivity[]
): Promise<{ newActivitiesCount: number; accomplishmentsCreated: number }> {
  const user = await getUser(email);
  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  // Merge new activities with existing ones (prevents duplicates, overwrites if same ID)
  const existingActivities = user.strava_account?.activities || {};
  const newActivitiesMap: Record<string, StravaActivity> = {};
  const newActivities: StravaActivity[] = [];
  
  activities.forEach(activity => {
    if (activity.id) {
      const activityId = activity.id.toString();
      newActivitiesMap[activityId] = activity;
      
      // Track truly new activities (not in existing activities)
      if (!existingActivities[activityId]) {
        newActivities.push(activity);
      }
    }
  });

  // Create accomplishments for new activities
  let accomplishmentsCreated = 0;
  for (const activity of newActivities) {
    try {
      const accomplishment = await createStravaAccomplishment(user.id, email, activity);
      if (accomplishment) {
        accomplishmentsCreated++;
        console.log(`Created accomplishment for Strava activity: ${activity.name}`);
      }
    } catch (error) {
      console.error(`Error creating accomplishment for activity ${activity.id}:`, error);
    }
  }

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

  // Invalidate cache so the updated sync history is returned on next request
  invalidateCache(email, 'users');

  return {
    newActivitiesCount: newActivities.length,
    accomplishmentsCreated
  };
}

/**
 * Checks if user can sync and determines sync type
 */
export async function canUserSync(email: string): Promise<{ 
  canSync: boolean; 
  syncType: 'first-time' | 'current-year' | 'rate-limited';
  nextAllowedSync?: number; 
  syncCount?: number;
  hasHistoricalSync?: boolean;
}> {
  const user = await getUser(email);
  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  const now = Date.now();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const syncHistory = user.strava_account?.sync_history || [];
  const hasHistoricalSync = user.strava_account?.historical_sync_completed || false;

  // If user has never done historical sync, allow it regardless of daily limit
  if (!hasHistoricalSync) {
    return {
      canSync: true,
      syncType: 'first-time',
      syncCount: 0,
      hasHistoricalSync: false
    };
  }

  // Filter syncs from today (only count current-year syncs for rate limiting)
  const todaysSyncs = syncHistory.filter((syncTime: number) => syncTime >= todayStart);

  if (todaysSyncs.length >= 4) {
    const nextAllowedSync = todayStart + 24 * 60 * 60 * 1000; // Tomorrow
    return {
      canSync: false,
      syncType: 'rate-limited',
      nextAllowedSync,
      syncCount: todaysSyncs.length,
      hasHistoricalSync: true
    };
  }

  return {
    canSync: true,
    syncType: 'current-year',
    syncCount: todaysSyncs.length,
    hasHistoricalSync: true
  };
}

/**
 * Syncs Strava activities for a user (refresh tokens + fetch + store activities)
 */
export async function syncStravaActivitiesForUser(
  email: string,
  beforeUnix: number = DC33_UNIX_END,
  afterUnix: number = DC33_UNIX_START
): Promise<{ activitiesCount: number; activities: StravaActivity[]; newActivities: number; existingActivities: number; accomplishmentsCreated: number }> {
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
    const { accomplishmentsCreated } = await addStravaActivitiesToUser(email, activities);
    
    console.log(`Synced ${activities.length} Strava activities for ${email} (${newActivities} new, ${activities.length - newActivities} existing, ${accomplishmentsCreated} accomplishments created)`);
    
    return {
      activitiesCount: activities.length,
      activities,
      newActivities,
      existingActivities: activities.length - newActivities,
      accomplishmentsCreated
    };
  } catch (error) {
    console.error(`Error syncing Strava activities for ${email}:`, error);
    throw error;
  }
}

/**
 * Unified sync function - does historical sync first time, then current year only
 */
export async function syncStravaActivitiesSmartForUser(
  email: string
): Promise<{ 
  activitiesCount: number; 
  activities: StravaActivity[]; 
  newActivities: number; 
  existingActivities: number; 
  syncType: 'first-time' | 'current-year';
  yearsScanned?: number[];
  accomplishmentsCreated: number;
}> {
  try {
    // Check what type of sync we should do
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
    let activities: StravaActivity[];
    let yearsScanned: number[] | undefined;

    if (syncCheck.syncType === 'first-time') {
      // First time: sync all historical DEFCON activities
      console.log(`First-time sync: fetching all historical DEFCON activities for ${email}`);
      activities = await getAllDefconActivitiesForUser(email);
      yearsScanned = DEFCON_DATES.map(d => d.year);
      
      // Mark historical sync as completed
      await markHistoricalSyncCompleted(email);
      
    } else {
      // Subsequent syncs: only current year
      console.log(`Current year sync: fetching DC33 activities for ${email}`);
      activities = await getStravaActivitiesForUser(email, DC33_UNIX_END, DC33_UNIX_START);
    }
    
    // Count new vs existing activities
    let newActivities = 0;
    activities.forEach(activity => {
      if (activity.id && !existingActivities[activity.id.toString()]) {
        newActivities++;
      }
    });

    // Store activities in user record (this will merge with existing, overwriting duplicates)
    const { accomplishmentsCreated } = await addStravaActivitiesToUser(email, activities);
    
    const logMessage = syncCheck.syncType === 'first-time' 
      ? `First-time sync: ${activities.length} DEFCON activities across ${yearsScanned?.length} years`
      : `Current sync: ${activities.length} DC33 activities`;
    
    console.log(`${logMessage} for ${email} (${newActivities} new, ${activities.length - newActivities} existing, ${accomplishmentsCreated} accomplishments created)`);
    
    return {
      activitiesCount: activities.length,
      activities,
      newActivities,
      existingActivities: activities.length - newActivities,
      syncType: syncCheck.syncType as 'first-time' | 'current-year',
      yearsScanned,
      accomplishmentsCreated
    };
  } catch (error) {
    console.error(`Error syncing Strava activities for ${email}:`, error);
    throw error;
  }
}

/**
 * Marks historical sync as completed for a user
 */
async function markHistoricalSyncCompleted(email: string): Promise<void> {
  const user = await getUser(email);
  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  const updatedStravaAccount = {
    ...user.strava_account,
    historical_sync_completed: true
  };

  await User.update({
    email: email,
    id: user.id,
  }).set({
    strava_account: updatedStravaAccount
  }).go();
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

    const url = `https://www.strava.com/api/v3/athlete/activities?before=${beforeUnix}&after=${afterUnix}&page=1&per_page=30`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearer}`,
      },
    });
    if (!response.ok) {
      throw new Error(`${response.status}`);
    }
    const data = await response.json();
    return { data };

  } catch (error) {
    console.error(`Error refreshing Strava token: ${error}`);
    return { error };
  }

}

async function fetchAllActivitiesInRange({ strava_account, beforeUnix, afterUnix }: { strava_account: any; beforeUnix: number; afterUnix: number; }): Promise<{ data: any; error?: undefined; } | { error: unknown; data?: undefined; }> {
  try {
    const bearer = strava_account.access_token
    if (!bearer) {
      throw new Error(`ERROR: No access_token in strava_account`);
    }

    const allActivities: any[] = [];
    let page = 1;
    const perPage = 100; // Max allowed by Strava
    
    // Debug logging
    console.log(`Fetching all Strava activities: after=${afterUnix} (${new Date(afterUnix * 1000).toISOString()}) before=${beforeUnix} (${new Date(beforeUnix * 1000).toISOString()})`);

    while (true) {
      const url = `https://www.strava.com/api/v3/athlete/activities?before=${beforeUnix}&after=${afterUnix}&page=${page}&per_page=${perPage}`;
      console.log(`Strava API URL (page ${page}): ${url}`);

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
      
      const pageData = await response.json();
      console.log(`Page ${page}: Got ${pageData.length} activities`);
      
      // Log details of each activity for debugging
      if (pageData.length > 0) {
        pageData.forEach((activity: any, index: number) => {
          console.log(`  Activity ${index + 1}: "${activity.name}" on ${activity.start_date} (${activity.start_latlng?.join(', ') || 'no GPS'})`);
        });
      }
      
      if (pageData.length === 0) {
        console.log(`No more activities, stopping at page ${page}`);
        break; // No more activities
      }
      
      allActivities.push(...pageData);
      
      if (pageData.length < perPage) {
        console.log(`Got less than ${perPage} activities (${pageData.length}), assuming last page`);
        break; // Last page
      }
      
      page++;
      
      // Add delay between requests to be nice to Strava API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Total activities fetched: ${allActivities.length}`);
    return { data: allActivities };

  } catch (error) {
    console.error(`Error fetching all activities: ${error}`);
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