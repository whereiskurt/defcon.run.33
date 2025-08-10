#!/usr/bin/env ts-node

import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Entity } from 'electrodb';
import * as readline from 'readline';

// Environment variables
const accessKeyId: string = process.env['USER_DYNAMODB_ID']!;
const secretAccessKey: string = process.env['USER_DYNAMODB_SECRET']!;
const region: string = process.env['USER_DYNAMODB_REGION']!;
const endpoint: string = process.env['USER_DYNAMODB_ENDPOINT']!;
const table: string = process.env['USER_DYNAMODB_SINGLE_TABLE']!;

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

// User Entity
const User = new Entity(
  {
    model: {
      entity: 'User',
      version: '1',
      service: 'auth',
    },
    attributes: {
      email: { type: 'string', required: true },
      id: { type: 'string', required: true },
      displayname: { type: 'string' },
      name: { type: 'string' },
      totalAccomplishmentType: {
        type: 'map',
        properties: {
          activity: { type: 'number' },
          social: { type: 'number' },
          meshctf: { type: 'number' },
        },
        default: () => ({ activity: 0, social: 0, meshctf: 0 }),
      },
      totalAccomplishmentYear: {
        type: 'any',
        default: () => ({}),
      },
      createdAt: { type: 'number', default: () => Date.now(), readOnly: true },
      updatedAt: { type: 'number', watch: '*', set: () => Date.now(), readOnly: true },
    },
    indexes: {
      primary: {
        pk: { field: 'pk', composite: ['email'] },
        sk: { field: 'sk', composite: ['id'] },
      },
    },
  },
  { client, table }
);

// Accomplishments Entity
const Accomplishments = new Entity(
  {
    model: {
      entity: 'Accomplishments',
      version: '1',
      service: 'auth',
    },
    attributes: {
      userId: { type: 'string', required: true },
      accomplishmentId: { type: 'string', required: true },
      type: { type: ['activity', 'social', 'meshctf'] as const, required: true },
      name: { type: 'string', required: true },
      description: { type: 'string' },
      completedAt: { type: 'number', required: true },
      year: { type: 'number', required: true },
      metadata: {
        type: 'map',
        properties: {
          flag: { type: 'string' },
          otp_code: { type: 'string' },
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
      createdAt: { type: 'number', default: () => Date.now(), readOnly: true },
      updatedAt: { type: 'number', watch: '*', set: () => Date.now(), readOnly: true },
    },
    indexes: {
      primary: {
        pk: { field: 'pk', composite: ['userId'] },
        sk: { field: 'sk', composite: ['accomplishmentId'] },
      },
      byType: {
        index: 'gsi1pk-gsi1sk-index',
        pk: { field: 'gsi1pk', composite: ['userId', 'type'] },
        sk: { field: 'gsi1sk', composite: ['completedAt'] },
      },
      byYear: {
        index: 'gsi2pk-gsi2sk-index',
        pk: { field: 'gsi2pk', composite: ['userId', 'year'] },
        sk: { field: 'gsi2sk', composite: ['completedAt'] },
      },
    },
  },
  { client, table }
);

async function findUser(identifier: string) {
  // Check if it's an email (contains @)
  if (identifier.includes('@')) {
    const users = await User.query.primary({ email: identifier }).go();
    return users.data.length > 0 ? users.data[0] : null;
  } else {
    // Search by displayname - need to scan all users
    // Paginate through ALL users - DynamoDB scan has 1MB limit per request
    const allUsers: any[] = [];
    let lastKey: any = null;
    
    do {
      const result: any = await User.scan.go({ cursor: lastKey });
      allUsers.push(...result.data);
      lastKey = result.cursor;
    } while (lastKey);
    
    return allUsers.find(user => user.displayname === identifier) || null;
  }
}

async function getAccomplishments(userId: string) {
  const accomplishments = await Accomplishments.query.primary({ userId }).go();
  return accomplishments.data;
}

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function deleteUser(user: any, accomplishments: any[]) {
  console.log('\n🗑️  Deleting user record...');
  await User.delete({ email: user.email, id: user.id }).go();
  console.log('✅ User record deleted');

  if (accomplishments.length > 0) {
    console.log(`\n🗑️  Deleting ${accomplishments.length} accomplishment records...`);
    for (const acc of accomplishments) {
      await Accomplishments.delete({ 
        userId: acc.userId, 
        accomplishmentId: acc.accomplishmentId 
      }).go();
    }
    console.log('✅ All accomplishment records deleted');
  }
}

async function main() {
  const identifier = process.argv[2];
  
  if (!identifier) {
    console.error('❌ Error: Please provide an email address or display name as a parameter');
    console.error('Usage: npm run delete-user <email|displayname>');
    console.error('Example: npm run delete-user test@example.com');
    console.error('Example: npm run delete-user rabbit_1234');
    process.exit(1);
  }

  try {
    console.log(`🔍 Searching for user: ${identifier}`);
    
    const user = await findUser(identifier);
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('\n✅ User found:');
    console.log('-'.repeat(50));
    console.log(`Email: ${user.email}`);
    console.log(`Display Name: ${user.displayname || 'N/A'}`);
    console.log(`Name: ${user.name || 'N/A'}`);
    console.log(`User ID: ${user.id}`);
    console.log(`Created: ${user.createdAt ? new Date(user.createdAt).toISOString() : 'N/A'}`);
    
    const accomplishments = user.totalAccomplishmentType || { activity: 0, social: 0, meshctf: 0 };
    console.log(`\nAccomplishments:`);
    console.log(`  Activity: ${accomplishments.activity || 0}`);
    console.log(`  Social: ${accomplishments.social || 0}`);
    console.log(`  MeshCTF: ${accomplishments.meshctf || 0}`);
    console.log(`  Total: ${(accomplishments.activity || 0) + (accomplishments.social || 0) + (accomplishments.meshctf || 0)}`);

    // Get actual accomplishment records
    const accomplishmentRecords = await getAccomplishments(user.id);
    console.log(`\nAccomplishment Records: ${accomplishmentRecords.length}`);

    if (accomplishmentRecords.length > 0) {
      console.log('\nRecent accomplishments:');
      accomplishmentRecords
        .sort((a, b) => b.completedAt - a.completedAt)
        .slice(0, 5)
        .forEach(acc => {
          console.log(`  - ${acc.type}: ${acc.name} (${new Date(acc.completedAt).toISOString().split('T')[0]})`);
        });
      if (accomplishmentRecords.length > 5) {
        console.log(`  ... and ${accomplishmentRecords.length - 5} more`);
      }
    }

    console.log('\n⚠️  WARNING: This action cannot be undone!');
    console.log(`This will permanently delete:`);
    console.log(`  - 1 user record`);
    console.log(`  - ${accomplishmentRecords.length} accomplishment records`);
    
    const answer = await askQuestion('\nAre you sure you want to delete this user and all their accomplishments? (yes/NO): ');
    
    if (answer.toLowerCase() === 'yes') {
      await deleteUser(user, accomplishmentRecords);
      console.log('\n✅ User and all related data successfully deleted!');
    } else {
      console.log('\n❌ Deletion cancelled.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);