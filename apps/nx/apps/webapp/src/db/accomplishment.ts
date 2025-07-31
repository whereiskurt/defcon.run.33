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
  
  // Update user accomplishment counts
  await UpdateUserAccomplishmentCounts(userEmail, accomplishment.type, accomplishment.year, true);
  
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
    await UpdateUserAccomplishmentCounts(
      userEmail, 
      accomplishment.data.type, 
      accomplishment.data.year, 
      false
    );
  }
  
  return result.data;
}