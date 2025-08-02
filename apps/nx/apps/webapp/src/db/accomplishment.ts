import { Entity } from 'electrodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import crypto from 'crypto';
import { UpdateUserAccomplishmentCounts } from './user';

const accessKeyId: string = process.env['USER_DYNAMODB_ID']!;
const secretAccessKey: string = process.env['USER_DYNAMODB_SECRET']!;
const region: string = process.env['USER_DYNAMODB_REGION']!;
const endpoint: string = process.env['USER_DYNAMODB_ENDPOINT']!;

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
    ...(region ? { region } : {}),
    ...(endpoint ? { endpoint } : {}),
  }),
  {
    marshallOptions: {
      convertEmptyValues: false,
    },
  }
);

const table: string = process.env['USER_DYNAMODB_SINGLE_TABLE']!;

const Accomplishments = new Entity(
  {
    model: {
      entity: 'Accomplishments',
      version: '1',
      service: 'auth',
    },
    attributes: {
      userId: {
        type: 'string',
        required: true,
      },
      accomplishmentId: {
        type: 'string',
        required: true,
      },
      type: {
        type: ['activity', 'social', 'meshctf'] as const,
        required: true,
      },
      name: {
        type: 'string',
        required: true,
      },
      description: {
        type: 'string',
      },
      completedAt: {
        type: 'number',
        required: true,
      },
      year: {
        type: 'number',
        required: true,
      },
      metadata: {
        type: 'map',
        properties: {
          flag: { type: 'string' },
          otp_code : { type: 'string' },
          qr_flag_id: { type: 'string' },
          qr_flag_name: { type: 'string' },
          flag_type: { type: 'string' },
          points: { type: 'number' },
          scanned_at: { type: 'string' },
          distance: { type: 'string' },
          time: { type: 'string' },
          rank: { type: 'number' },
          participants: { type: 'number' },
          location: { type: 'string' },
          eventDate: { type: 'string' },
          stravaActivityId: { type: 'string' },
          gpxUrl: { type: 'string' },
          photoUrls: { type: 'list', items: { type: 'string' } },
          tags: { type: 'list', items: { type: 'string' } },
          // Strava activity specific fields
          summary_polyline: { type: 'string' },
          start_date: { type: 'string' },
          end_date: { type: 'string' },
          activity_type: { type: 'string' },
          sport_type: { type: 'string' },
          moving_time: { type: 'number' },
          elapsed_time: { type: 'number' },
          total_elevation_gain: { type: 'number' },
          average_speed: { type: 'number' },
          max_speed: { type: 'number' },
          start_latlng: { type: 'list', items: { type: 'number' } },
          end_latlng: { type: 'list', items: { type: 'number' } },
        },
      },
      createdAt: {
        type: 'number',
        default: () => Date.now(),
        readOnly: true,
      },
      updatedAt: {
        type: 'number',
        watch: '*',
        set: () => Date.now(),
        readOnly: true,
      },
    },
    indexes: {
      primary: {
        pk: {
          field: 'pk',
          composite: ['userId'],
        },
        sk: {
          field: 'sk',
          composite: ['accomplishmentId'],
        },
      },
      byType: {
        index: 'gsi1pk-gsi1sk-index',
        pk: {
          field: 'gsi1pk',
          composite: ['userId', 'type'],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['completedAt'],
        },
      },
      byYear: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: ['userId', 'year'],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['completedAt'],
        },
      },
    },
  },
  { client, table }
);

export { Accomplishments };

// Accomplishment helper functions
export async function createAccomplishment(
  userId: string,
  userEmail: string,
  accomplishment: {
    type: 'activity' | 'social' | 'meshctf';
    name: string;
    description?: string;
    completedAt: number;
    year: number;
    metadata?: any;
  }
) {
  const accomplishmentId = crypto.randomUUID();
  
  const result = await Accomplishments.create({
    userId,
    accomplishmentId,
    ...accomplishment,
  }).go();
  
  // Extract points from metadata (for CTF flags)
  const points = accomplishment.metadata?.points || 0;
  
  // Update user accomplishment counts
  await UpdateUserAccomplishmentCounts(userEmail, accomplishment.type, accomplishment.year, true, points);
  
  return result.data;
}

export async function getAccomplishmentsByUser(userId: string) {
  const result = await Accomplishments.query
    .primary({
      userId,
    })
    .go();
  
  return result.data;
}

export async function getAccomplishmentsByType(
  userId: string,
  type: 'activity' | 'social' | 'meshctf'
) {
  const result = await Accomplishments.query
    .byType({
      userId,
      type,
    })
    .go();
  
  return result.data;
}

export async function getAccomplishmentsByYear(userId: string, year: number) {
  const result = await Accomplishments.query
    .byYear({
      userId,
      year,
    })
    .go();
  
  return result.data;
}

export async function checkDuplicateAccomplishment(
  userId: string,
  type: 'activity' | 'social' | 'meshctf',
  name: string,
  year: number
) {
  // Query all accomplishments for the user and filter by type, name, and year
  const result = await Accomplishments.query
    .primary({
      userId,
    })
    .go();
  
  const duplicate = result.data.find(
    (acc) => acc.type === type && acc.name === name && acc.year === year
  );
  
  return duplicate !== undefined;
}

export async function updateAccomplishment(
  userId: string,
  accomplishmentId: string,
  updates: Partial<{
    name: string;
    description: string;
    metadata: any;
  }>
) {
  const result = await Accomplishments.update({
    userId,
    accomplishmentId,
  })
    .set(updates)
    .go({
      response: 'all_new',
    });
  
  return result.data;
}

export async function deleteAccomplishment(
  userId: string,
  accomplishmentId: string,
  userEmail: string
) {
  // Get the accomplishment first to get its type and year for count updates
  const accomplishment = await Accomplishments.get({
    userId,
    accomplishmentId,
  }).go();
  
  const result = await Accomplishments.delete({
    userId,
    accomplishmentId,
  }).go();
  
  // Update user accomplishment counts (decrement)
  if (accomplishment.data) {
    const points = accomplishment.data.metadata?.points || 0;
    await UpdateUserAccomplishmentCounts(
      userEmail, 
      accomplishment.data.type, 
      accomplishment.data.year, 
      false,
      points
    );
  }
  
  return result.data;
}

export async function getAllAccomplishmentsForLeaderboard() {
  const result = await Accomplishments.scan.go();
  
  return result.data.map(accomplishment => ({
    userId: accomplishment.userId,
    type: accomplishment.type,
    name: accomplishment.name,
    description: accomplishment.description,
    completedAt: accomplishment.completedAt,
    year: accomplishment.year,
    metadata: accomplishment.metadata
  }));
}

export async function getAllAccomplishmentsForType(type: 'activity' | 'social' | 'meshctf') {
  // Use scan with filter for type since we need to check across all users
  const result = await Accomplishments.scan
    .where(({ type: typeAttr }, { eq }) => eq(typeAttr, type))
    .go();
  
  return result.data.map(accomplishment => ({
    userId: accomplishment.userId,
    type: accomplishment.type,
    name: accomplishment.name,
    description: accomplishment.description,
    completedAt: accomplishment.completedAt,
    year: accomplishment.year,
    metadata: accomplishment.metadata
  }));
}

/**
 * Maps Strava activity types to appropriate verbs for descriptions
 */
function getActivityVerb(activityType: string): string {
  const type = activityType.toLowerCase();
  
  // Map common Strava activity types to appropriate verbs
  const verbMap: Record<string, string> = {
    'run': 'running',
    'running': 'running',
    'walk': 'walking',
    'walking': 'walking',
    'hike': 'hiking',
    'hiking': 'hiking',
    'ride': 'cycling',
    'cycling': 'cycling',
    'bike': 'cycling',
    'virtualride': 'virtual cycling',
    'swim': 'swimming',
    'swimming': 'swimming',
    'workout': 'workout',
    'crosstraining': 'cross-training',
    'elliptical': 'elliptical training',
    'stairstepper': 'stair climbing',
    'weighttraining': 'weight training',
    'yoga': 'yoga',
    'pilates': 'pilates',
    'golf': 'golfing',
    'tennis': 'playing tennis',
    'basketball': 'playing basketball',
    'soccer': 'playing soccer',
    'football': 'playing football',
    'baseball': 'playing baseball',
    'skateboard': 'skateboarding',
    'rollerski': 'roller skiing',
    'ski': 'skiing',
    'snowboard': 'snowboarding',
    'iceskate': 'ice skating'
  };
  
  return verbMap[type] || `${type} activity`;
}

export async function createStravaAccomplishment(
  userId: string,
  userEmail: string,
  activity: any // StravaActivity type
) {
  if (!activity.id || !activity.start_date) {
    throw new Error('Invalid Strava activity: missing required fields');
  }

  const activityDate = new Date(activity.start_date);
  const year = activityDate.getFullYear();
  
  // Create accomplishment name and description using the correct activity type
  // Strava uses 'sport_type' as the more specific type (e.g., "Run", "Walk", "Ride", "Hike")
  // and 'type' as the general category (e.g., "Run", "Ride", "Walk")
  const activityType = activity.sport_type || activity.type || 'Activity';
  const name = `${activityType}: "${activity.name || 'Unnamed Activity'}"`;
  
  // Format distance and time for description
  const distanceKm = activity.distance ? (activity.distance / 1000).toFixed(2) : '0';
  const movingTimeMin = activity.moving_time ? Math.round(activity.moving_time / 60) : 0;
  
  // Use the correct activity type in description (walking, running, cycling, etc.)
  const activityVerb = getActivityVerb(activityType);
  // Convert year to DEFCON number (DC32 = 2024, DC31 = 2023, etc.)
  const defconNumber = year - 1992; // DEFCON 1 was in 1993, so 2024 = DC32
  const description = `DC${defconNumber} - ${distanceKm}km ${activityVerb} in ${movingTimeMin} minutes`;

  // Simple points: 1 point per activity regardless of other factors
  const points = 1;

  // Check for duplicate accomplishment
  const isDuplicate = await checkDuplicateAccomplishment(
    userId,
    'activity',
    name,
    year
  );

  if (isDuplicate) {
    console.log(`Skipping duplicate accomplishment: ${name}`);
    return null;
  }

  const metadata = {
    points,
    stravaActivityId: activity.id?.toString(),
    summary_polyline: activity.map?.summary_polyline,
    start_date: activity.start_date,
    end_date: activity.start_date, // Strava doesn't have end_date, using start_date
    activity_type: activity.type,
    sport_type: activity.sport_type,
    distance: activity.distance?.toString(),
    moving_time: activity.moving_time,
    elapsed_time: activity.elapsed_time,
    total_elevation_gain: activity.total_elevation_gain,
    average_speed: activity.average_speed,
    max_speed: activity.max_speed,
    start_latlng: activity.start_latlng,
    end_latlng: activity.end_latlng,
    location: activity.location_city || activity.location_state || 'Las Vegas, NV'
  };

  return await createAccomplishment(userId, userEmail, {
    type: 'activity',
    name,
    description,
    completedAt: activityDate.getTime(),
    year,
    metadata
  });
}