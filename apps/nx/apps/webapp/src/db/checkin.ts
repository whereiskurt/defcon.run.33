import { Entity } from 'electrodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import crypto from 'crypto';
import { getUser, updateUser } from './user';
import { invalidateCache } from './cache';

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

const CheckIn = new Entity(
  {
    model: {
      entity: 'CheckIn',
      version: '1',
      service: 'auth',
    },
    attributes: {
      userId: {
        type: 'string',
        required: true,
      },
      checkInId: {
        type: 'string',
        required: true,
      },
      timestamp: {
        type: 'number',
        required: true,
      },
      source: {
        type: 'string',
        required: true,
      },
      samples: {
        type: 'any', // Store as any to handle null values in GPS samples
        required: true,
      },
      averageCoordinates: {
        type: 'map',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' },
        },
        required: true,
      },
      bestAccuracy: {
        type: 'number',
        required: true,
      },
      userAgent: {
        type: 'string',
      },
      // Geospatial fields for future geo queries
      geoHash: {
        type: 'string',
      },
      // S3 reference for large GPS sample data (future use)
      s3Key: {
        type: 'string',
      },
      // Summary stats
      pointsCount: {
        type: 'number',
      },
      duration: {
        type: 'number', // Duration in seconds between first and last sample
      },
      distance: {
        type: 'number', // Total distance traveled in meters
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
          composite: ['timestamp', 'checkInId'],
        },
      },
      byGlobalRecent: {
        index: 'gsi1pk-gsi1sk-index',
        pk: {
          field: 'gsi1pk',
          composite: [],
          template: 'TYPE#CHECKIN',
        },
        sk: {
          field: 'gsi1sk',
          composite: ['timestamp'],
        },
      },
      byUserRecent: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: ['userId'],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['timestamp'],
        },
      },
    },
  },
  { client, table }
);

export { CheckIn };

// Helper functions

export interface GPSSample {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface CheckInData {
  source: string;
  samples: GPSSample[];
  userAgent?: string;
}

/**
 * Create a new check-in for a user
 */
export async function createCheckIn(
  userEmail: string,
  checkInData: CheckInData
) {
  // Get user to check quota and get userId
  const user = await getUser(userEmail);
  if (!user) {
    throw new Error('User not found');
  }

  // Check quota
  const currentQuota = user.quota?.checkIns ?? 50;
  if (currentQuota <= 0) {
    throw new Error('Check-in quota exceeded');
  }

  const { samples, source, userAgent } = checkInData;

  if (!samples || !Array.isArray(samples) || samples.length === 0) {
    throw new Error('Invalid samples data');
  }

  // Calculate average coordinates and stats
  const avgLat = samples.reduce((sum, s) => sum + s.latitude, 0) / samples.length;
  const avgLng = samples.reduce((sum, s) => sum + s.longitude, 0) / samples.length;
  const bestAccuracy = Math.min(...samples.map(s => s.accuracy));
  
  // Calculate duration if we have multiple samples
  let duration = 0;
  if (samples.length > 1) {
    const firstTimestamp = samples[0].timestamp;
    const lastTimestamp = samples[samples.length - 1].timestamp;
    duration = (lastTimestamp - firstTimestamp) / 1000; // Convert to seconds
  }

  // Create check-in
  const checkInId = crypto.randomUUID();
  const timestamp = Date.now();

  const result = await CheckIn.create({
    userId: user.id,
    checkInId,
    timestamp,
    source: source || 'Web GPS',
    samples,
    averageCoordinates: {
      latitude: avgLat,
      longitude: avgLng,
    },
    bestAccuracy,
    userAgent,
    pointsCount: samples.length,
    duration,
  }).go();

  // Update user with decremented quota and denormalized fields
  await updateUser({
    email: userEmail,
    quota: {
      ...user.quota,
      checkIns: currentQuota - 1,
    },
    lastCheckInAt: timestamp,
    checkInCount: (user.checkInCount || 0) + 1,
  });

  // Invalidate user cache
  invalidateCache(userEmail, 'users');

  return result.data;
}

/**
 * Get check-ins for a user with pagination
 */
export async function getCheckInsByUser(
  userId: string,
  limit: number = 20,
  cursor?: string
) {
  const result = await CheckIn.query
    .byUserRecent({
      userId,
    })
    .go({
      limit,
      cursor,
      order: 'desc', // Most recent first
    });

  return {
    data: result.data,
    cursor: result.cursor,
  };
}

/**
 * Get recent check-ins globally (for admin/analytics)
 */
export async function getRecentCheckIns(
  limit: number = 20,
  cursor?: string
) {
  const result = await CheckIn.query
    .byGlobalRecent({})
    .go({
      limit,
      cursor,
      order: 'desc',
    });

  return {
    data: result.data,
    cursor: result.cursor,
  };
}

/**
 * Get a single check-in
 */
export async function getCheckIn(userId: string, timestamp: number, checkInId: string) {
  const result = await CheckIn.get({
    userId,
    timestamp,
    checkInId,
  }).go();

  return result.data;
}

/**
 * Delete a check-in (admin function)
 */
export async function deleteCheckIn(
  userId: string,
  timestamp: number,
  checkInId: string,
  userEmail: string
) {
  const result = await CheckIn.delete({
    userId,
    timestamp,
    checkInId,
  }).go();

  // Update user check-in count
  const user = await getUser(userEmail);
  if (user && user.checkInCount && user.checkInCount > 0) {
    await updateUser({
      email: userEmail,
      checkInCount: user.checkInCount - 1,
    });
    invalidateCache(userEmail, 'users');
  }

  return result.data;
}

/**
 * Get check-ins count for a user
 */
export async function getCheckInCount(userId: string): Promise<number> {
  let count = 0;
  let cursor: string | undefined = undefined;

  do {
    const result: any = await CheckIn.query
      .byUserRecent({ userId })
      .go({ cursor, limit: 100 });
    
    count += result.data.length;
    cursor = result.cursor;
  } while (cursor);

  return count;
}

/**
 * Migrate check-ins from User entity to CheckIn entity
 * This is a one-time migration function
 */
export async function migrateUserCheckIns(userEmail: string) {
  const user = await getUser(userEmail);
  if (!user || !user.checkIns || user.checkIns.length === 0) {
    console.log(`No check-ins to migrate for user ${userEmail}`);
    return 0;
  }

  let migrated = 0;
  const checkIns = user.checkIns;

  // Sort by timestamp to preserve order
  checkIns.sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));

  for (const oldCheckIn of checkIns) {
    try {
      const checkInId = crypto.randomUUID();
      
      await CheckIn.create({
        userId: user.id,
        checkInId,
        timestamp: oldCheckIn.timestamp || Date.now(),
        source: oldCheckIn.source || 'Web GPS',
        samples: oldCheckIn.samples || [],
        averageCoordinates: oldCheckIn.averageCoordinates || { latitude: 0, longitude: 0 },
        bestAccuracy: oldCheckIn.bestAccuracy || 0,
        userAgent: oldCheckIn.userAgent,
        pointsCount: oldCheckIn.samples?.length || 0,
      }).go();

      migrated++;
    } catch (error) {
      console.error(`Failed to migrate check-in for user ${userEmail}:`, error);
    }
  }

  // Update user with denormalized fields and remove old checkIns
  if (migrated > 0) {
    const lastCheckIn = checkIns[checkIns.length - 1];
    await updateUser({
      email: userEmail,
      lastCheckInAt: lastCheckIn.timestamp || Date.now(),
      checkInCount: migrated,
    });
    invalidateCache(userEmail, 'users');
  }

  console.log(`Migrated ${migrated} check-ins for user ${userEmail}`);
  return migrated;
}