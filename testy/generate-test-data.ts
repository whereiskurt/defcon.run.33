#!/usr/bin/env ts-node

import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Entity } from 'electrodb';
import { createHash, generateKeyPairSync } from 'crypto';
import * as qr from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Environment variables
const accessKeyId: string = process.env['USER_DYNAMODB_ID']!;
const secretAccessKey: string = process.env['USER_DYNAMODB_SECRET']!;
const region: string = process.env['USER_DYNAMODB_REGION']!;
const endpoint: string = process.env['USER_DYNAMODB_ENDPOINT']!;
const table: string = process.env['USER_DYNAMODB_SINGLE_TABLE']!;
const creationSeed: string = process.env['USER_CREATION_SEED'] || 'default-seed';

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
      eqr: { type: 'string' },
      seed: { type: 'string' },
      hash: { type: 'string' },
      name: { type: 'string' },
      rsapubSHA: { type: 'string' },
      rsaprivSHA: { type: 'string' },
      picture: { type: 'string' },
      profile_theme: { type: 'string' },
      profile_scope: { type: 'string' },
      mqtt_username: { type: 'string' },
      mqtt_password: { type: 'string' },
      mqtt_usertype: { type: ['rabbit', 'admin'] as const },
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
      byRsaPubSHA: {
        index: 'gsi1pk-gsi1sk-index',
        pk: { field: 'gsi1pk', composite: ['hash'] },
        sk: { field: 'gsi1sk', composite: ['email'] },
      },
      byMqttUsername: {
        index: 'gsi2pk-gsi2sk-index',
        pk: { field: 'gsi2pk', composite: ['mqtt_username'] },
        sk: { field: 'gsi2sk', composite: ['id'] },
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

// Test data generators
const activities = [
  'Morning Run', 'Evening Jog', 'Trail Run', 'Park Walk', 'Beach Walk', 
  'Mountain Hike', 'City Exploration', 'Neighborhood Walk', 'Track Workout', 
  'Marathon Training', 'Half Marathon', '5K Fun Run', 'Charity Walk'
];

const socialEvents = [
  'DEFCON Social Mixer', 'Hacker Meetup', 'Security Conference', 'Tech Talk',
  'Networking Event', 'Community Gathering', 'Workshop Attendance', 'Panel Discussion',
  'Lightning Talks', 'Capture The Flag Event', 'Security Training'
];

const meshctfFlags = [
  'mesh_basic_connectivity', 'wireless_protocol_analysis', 'frequency_hopping',
  'signal_interference', 'mesh_routing', 'encryption_bypass', 'node_discovery',
  'packet_injection', 'firmware_analysis', 'radio_forensics'
];

const firstNames = [
  'Alex', 'Blake', 'Casey', 'Drew', 'Ember', 'Finley', 'Gray', 'Harper',
  'Indie', 'Jordan', 'Kai', 'Lane', 'Morgan', 'Nova', 'Ocean', 'Phoenix',
  'Quinn', 'River', 'Sage', 'Taylor', 'Uma', 'Vale', 'Winter', 'Xen'
];

const lastNames = [
  'Cipher', 'Binary', 'Vector', 'Matrix', 'Quantum', 'Neural', 'Digital',
  'Crypto', 'Logic', 'Syntax', 'Protocol', 'Network', 'Signal', 'Payload',
  'Runtime', 'Kernel', 'Buffer', 'Socket', 'Thread', 'Process'
];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate2025(): number {
  const start = new Date('2025-01-01').getTime();
  const end = new Date('2025-12-31').getTime();
  return randomBetween(start, end);
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

async function createTestUser(index: number) {
  const firstName = randomElement(firstNames);
  const lastName = randomElement(lastNames);
  const email = `test.runner.${index}@defcon.run`;
  const id = crypto.randomUUID();
  const displayname = `${firstName}_${lastName}_${randomBetween(1000, 9999)}`;

  // Generate RSA keys
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  const seed = crypto.randomBytes(16).toString('hex');
  const rsapub = publicKey.export({ type: 'spki', format: 'pem' }).toString('base64');
  const rsapriv = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString('base64');

  const rsapubSHA = createHash('sha256').update(`${rsapub}`).digest('hex');
  const rsaprivSHA = createHash('sha256').update(`${rsapriv}`).digest('hex');
  const hash = createHash('sha256').update(`${rsapubSHA}${seed}`).digest('hex');
  
  const eqr = await qr.toDataURL(`https://run.defcon.run/r?h=${hash}`, {
    errorCorrectionLevel: 'H',
    width: 300,
  });

  const mqttuser = createHash('sha256')
    .update(email + creationSeed)
    .digest('hex')
    .slice(0, 12)
    .toLowerCase();

  const mqttpass = createHash('sha256')
    .update(mqttuser + creationSeed)
    .digest('hex')
    .slice(0, 12)
    .toLowerCase();

  const newUser = {
    id,
    email,
    displayname,
    name: `${firstName} ${lastName}`,
    seed,
    hash,
    eqr,
    rsapubSHA,
    rsaprivSHA,
    profile_theme: 'dark',
    mqtt_username: mqttuser,
    mqtt_password: mqttpass,
    mqtt_usertype: 'rabbit' as const,
    profile_scope: 'public',
  };

  return await User.create(newUser).go();
}

async function createAccomplishment(userId: string, userEmail: string) {
  const accomplishmentId = crypto.randomUUID();
  const types: ('activity' | 'social' | 'meshctf')[] = ['activity', 'social', 'meshctf'];
  const type = randomElement(types);
  const completedAt = randomDate2025();
  
  let name: string;
  let description: string;
  let metadata = {};

  switch (type) {
    case 'activity':
      name = randomElement(activities);
      description = `Completed ${name.toLowerCase()} activity`;
      metadata = {
        distance: `${randomBetween(1, 10)}.${randomBetween(10, 99)}km`,
        time: `${randomBetween(20, 120)}:${randomBetween(10, 59).toString().padStart(2, '0')}`,
        location: `Location ${randomBetween(1, 50)}`,
      };
      break;
    case 'social':
      name = randomElement(socialEvents);
      description = `Attended ${name.toLowerCase()}`;
      metadata = {
        eventDate: new Date(completedAt).toISOString().split('T')[0],
        participants: randomBetween(10, 200),
        location: `Venue ${randomBetween(1, 20)}`,
      };
      break;
    case 'meshctf':
      name = randomElement(meshctfFlags);
      description = `Captured CTF flag: ${name}`;
      metadata = {
        flag: `DEFCON{${name}_${randomBetween(1000, 9999)}}`,
        rank: randomBetween(1, 100),
      };
      break;
  }

  const accomplishment = {
    userId,
    accomplishmentId,
    type,
    name,
    description,
    completedAt,
    year: 2025,
    metadata,
  };

  return await Accomplishments.create(accomplishment).go();
}

async function updateUserAccomplishmentCounts(userEmail: string, accomplishments: any[]) {
  const counts = { activity: 0, social: 0, meshctf: 0 };
  
  accomplishments.forEach(acc => {
    counts[acc.type]++;
  });

  const user = await User.query.primary({ email: userEmail }).go();
  if (user.data.length > 0) {
    await User.update({
      email: userEmail,
      id: user.data[0].id,
    }).set({
      totalAccomplishmentType: counts,
      totalAccomplishmentYear: { '2025': counts.activity + counts.social + counts.meshctf },
    }).go();
  }
}

async function main() {
  console.log('🚀 Starting test data generation...');
  console.log(`📊 Creating 100 users with 4-10 accomplishments each for 2025`);
  
  for (let i = 1; i <= 100; i++) {
    try {
      console.log(`👤 Creating user ${i}/100...`);
      
      // Create user
      const user = await createTestUser(i);
      
      // Create 4-10 accomplishments for this user
      const numAccomplishments = randomBetween(4, 10);
      const accomplishments = [];
      
      console.log(`  📈 Creating ${numAccomplishments} accomplishments...`);
      
      for (let j = 0; j < numAccomplishments; j++) {
        const accomplishment = await createAccomplishment(user.data.id, user.data.email);
        accomplishments.push(accomplishment.data);
      }
      
      // Update user's accomplishment counts
      await updateUserAccomplishmentCounts(user.data.email, accomplishments);
      
      console.log(`  ✅ User ${user.data.displayname} created with ${numAccomplishments} accomplishments`);
      
    } catch (error) {
      console.error(`❌ Error creating user ${i}:`, error);
    }
  }
  
  console.log('🎉 Test data generation complete!');
}

// Run the script
main().catch(console.error);