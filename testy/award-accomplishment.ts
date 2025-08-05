#!/usr/bin/env ts-node

import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Entity } from 'electrodb';
import crypto from 'crypto';
import * as readline from 'readline';
import fetch from 'node-fetch';

// Environment variables
const accessKeyId: string = process.env['USER_DYNAMODB_ID']!;
const secretAccessKey: string = process.env['USER_DYNAMODB_SECRET']!;
const region: string = process.env['USER_DYNAMODB_REGION']!;
const endpoint: string = process.env['USER_DYNAMODB_ENDPOINT']!;
const table: string = process.env['USER_DYNAMODB_SINGLE_TABLE']!;

// Strapi configuration
const STRAPI_URL = process.env['STRAPI_URL'] || 'https://strapi.defcon.run';
const STRAPI_TOKEN = process.env['AUTH_STRAPI_TOKEN'];

// Strapi API helper
async function strapi(endpoint: string) {
  const url = `${STRAPI_URL}/api${endpoint}`;
  const headers: any = {
    'Content-Type': 'application/json',
  };
  
  if (STRAPI_TOKEN) {
    headers['Authorization'] = `Bearer ${STRAPI_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`Strapi API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

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
          ghost_handle: { type: 'string' },
          ghost_name: { type: 'string' },
          qr_flag_id: { type: 'string' },
          qr_flag_name: { type: 'string' },
          flag_type: { type: 'string' },
          points: { type: 'number' },
          scanned_at: { type: 'string' },
          location: { type: 'string' },
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
  if (identifier.includes('@')) {
    const users = await User.query.primary({ email: identifier }).go();
    return users.data.length > 0 ? users.data[0] : null;
  } else {
    const allUsers = await User.scan.go();
    return allUsers.data.find(user => user.displayname === identifier) || null;
  }
}

async function updateUserAccomplishmentCounts(userEmail: string, type: 'activity' | 'social' | 'meshctf', year: number, points: number = 1) {
  const user = await User.query.primary({ email: userEmail }).go();
  if (user.data.length === 0) return;

  const userData = user.data[0];
  const currentCounts = userData.totalAccomplishmentType || { activity: 0, social: 0, meshctf: 0 };
  const currentYearCounts = userData.totalAccomplishmentYear || {};

  const updatedCounts = {
    ...currentCounts,
    [type]: (currentCounts[type] || 0) + 1
  };

  const yearTotal = (currentYearCounts[year] || 0) + 1;
  const updatedYearCounts = {
    ...currentYearCounts,
    [year]: yearTotal
  };

  await User.update({
    email: userEmail,
    id: userData.id,
  }).set({
    totalAccomplishmentType: updatedCounts,
    totalAccomplishmentYear: updatedYearCounts,
  }).go();
}

async function createAccomplishment(
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
  
  const points = accomplishment.metadata?.points || 1;
  await updateUserAccomplishmentCounts(userEmail, accomplishment.type, accomplishment.year, points);
  
  return result.data;
}

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function formatItemsInColumns(items: { id: string; name: string; points?: number }[], itemType: string): void {
  console.log(`\n📋 Available ${itemType}s:`);
  console.log('=' .repeat(80));
  
  const itemsPerRow = 3;
  const maxWidth = 25;
  
  for (let i = 0; i < items.length; i += itemsPerRow) {
    let row = '';
    for (let j = 0; j < itemsPerRow && i + j < items.length; j++) {
      const itemIndex = i + j;
      const item = items[itemIndex];
      const number = (itemIndex + 1).toString().padStart(2, ' ');
      const points = item.points ? ` (${item.points}p)` : '';
      const displayText = `${number}. ${item.name}${points}`;
      const truncated = displayText.length > maxWidth 
        ? displayText.substring(0, maxWidth - 3) + '...' 
        : displayText;
      row += truncated.padEnd(maxWidth + 2);
    }
    console.log(row);
  }
  console.log('=' .repeat(80));
}

async function selectFromList(items: { id: string; name: string; points?: number }[], itemType: string): Promise<{ id: string; name: string; points?: number } | null> {
  if (items.length === 0) {
    console.log(`❌ No ${itemType}s available`);
    return null;
  }
  
  formatItemsInColumns(items, itemType);
  
  const answer = await askQuestion(`\nEnter number (1-${items.length}) or 'q' to quit: `);
  
  if (answer.toLowerCase() === 'q') {
    return null;
  }
  
  const selection = parseInt(answer);
  if (isNaN(selection) || selection < 1 || selection > items.length) {
    console.log('❌ Invalid selection');
    return null;
  }
  
  return items[selection - 1];
}

async function fetchAllGhosts(): Promise<{ id: string; name: string; points?: number }[]> {
  try {
    const ghosts = await strapi('/ghosts?populate=*');
    if (!ghosts.data || !Array.isArray(ghosts.data)) {
      return [];
    }
    
    return ghosts.data.map((ghost: any) => ({
      id: ghost.handle,
      name: ghost.name || ghost.handle,
      points: ghost.points || 10
    }));
  } catch (error) {
    console.error('❌ Error fetching ghosts from Strapi:', error);
    return [];
  }
}

async function fetchAllQRFlags(): Promise<{ id: string; name: string; points?: number }[]> {
  try {
    const qrflags = await strapi('/qrflags?populate=*');
    if (!qrflags.data || !Array.isArray(qrflags.data)) {
      return [];
    }
    
    return qrflags.data.map((qrflag: any) => ({
      id: qrflag.unique_id,
      name: qrflag.name || qrflag.unique_id,
      points: qrflag.points || 1
    }));
  } catch (error) {
    console.error('❌ Error fetching QR flags from Strapi:', error);
    return [];
  }
}

async function awardGhost(user: any, ghostHandle: string) {
  const year = new Date().getFullYear();
  
  // Fetch ghost data from Strapi
  try {
    const ghosts = await strapi('/ghosts?populate=*');
    
    if (!ghosts.data || !Array.isArray(ghosts.data)) {
      console.error('❌ Invalid ghost data from Strapi');
      return null;
    }
    
    // Find the ghost matching the handle
    const ghost = ghosts.data.find((g: any) => 
      g && g.handle === ghostHandle
    );
    
    if (!ghost) {
      console.error(`❌ Ghost not found for handle: ${ghostHandle}`);
      console.log('Available ghost handles:', ghosts.data.map((g: any) => g.handle).join(', '));
      return null;
    }
    
    const ghostName = ghost.name || ghostHandle;
    const points = ghost.points || 10; // Default to 10 if not specified
    
    const accomplishmentName = `CTF Challenge: ${ghostName}`;
    
    // Check for duplicates
    const userAccomplishments = await Accomplishments.query.byType({
      userId: user.id,
      type: 'meshctf'
    }).go();
    
    const isDuplicate = userAccomplishments.data.some(acc => 
      acc.name === accomplishmentName && acc.year === year
    );
    
    if (isDuplicate) {
      console.log('❌ User already has this accomplishment for this year');
      return null;
    }

    console.log(`📊 Ghost found: ${ghostName} (${points} points)`);

    const accomplishment = await createAccomplishment(
      user.id,
      user.email,
      {
        type: 'meshctf',
        name: accomplishmentName,
        description: `Completed CTF challenge ${ghostName} (${ghostHandle})`,
        completedAt: Date.now(),
        year: year,
        metadata: {
          ghost_handle: ghostHandle,
          ghost_name: ghostName,
          points: points,
          flag: `MANUAL_AWARD_${ghostHandle}`,
        },
      }
    );

    return accomplishment;
    
  } catch (error) {
    console.error('❌ Error fetching ghost data from Strapi:', error);
    return null;
  }
}

async function awardQRFlag(user: any, qrFlagId: string) {
  const year = new Date().getFullYear();
  
  // Fetch QR flag data from Strapi
  try {
    const qrflags = await strapi('/qrflags?populate=*');
    
    if (!qrflags.data || !Array.isArray(qrflags.data)) {
      console.error('❌ Invalid qrflags data from Strapi');
      return null;
    }
    
    // Find the QR flag matching the unique_id
    const qrflag = qrflags.data.find((qr: any) => 
      qr && qr.unique_id === qrFlagId
    );
    
    if (!qrflag) {
      console.error(`❌ QR flag not found for ID: ${qrFlagId}`);
      console.log('Available QR flag IDs:', qrflags.data.map((qr: any) => qr.unique_id).join(', '));
      return null;
    }
    
    const qrName = qrflag.name || qrFlagId;
    const points = qrflag.points || 1; // Default to 1 if not specified
    const flagType = qrflag.flag_type && ['activity', 'social', 'meshctf'].includes(qrflag.flag_type) 
      ? qrflag.flag_type 
      : 'activity'; // Default to activity
    
    const baseName = qrflag.accomplishment_name || `QR Code: ${qrName}`;
    
    // Check for duplicates
    const userAccomplishments = await Accomplishments.query.primary({
      userId: user.id
    }).go();
    
    const isDuplicate = userAccomplishments.data.some(acc => 
      acc.metadata?.qr_flag_id === qrFlagId
    );
    
    if (isDuplicate) {
      console.log('❌ User already has this QR flag accomplishment');
      return null;
    }

    console.log(`📊 QR Flag found: ${qrName} (${points} points, type: ${flagType})`);

    const accomplishment = await createAccomplishment(
      user.id,
      user.email,
      {
        type: flagType,
        name: baseName,
        description: qrflag.accomplishment_description || `Found QR code ${qrName}`,
        completedAt: Date.now(),
        year: year,
        metadata: {
          qr_flag_id: qrFlagId,
          qr_flag_name: qrName,
          flag_type: flagType,
          points: points,
          scanned_at: new Date().toISOString(),
          ...(qrflag.location && { location: qrflag.location }),
        },
      }
    );

    return accomplishment;
    
  } catch (error) {
    console.error('❌ Error fetching QR flag data from Strapi:', error);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Error: No arguments provided');
    console.error('Usage: npm run award-accomplishment <email|displayname> [ghost|qrflag] [handle|flag_id]');
    console.error('Examples:');
    console.error('  npm run award-accomplishment test@example.com');
    console.error('  npm run award-accomplishment test@example.com ghost');
    console.error('  npm run award-accomplishment test@example.com ghost darkweb_master');
    console.error('  npm run award-accomplishment rabbit_1234 qrflag location_001');
    process.exit(1);
  }

  const [identifier, awardType, awardValue] = args;
  
  if (awardType && !['ghost', 'qrflag'].includes(awardType)) {
    console.error('❌ Error: Award type must be either "ghost" or "qrflag"');
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

    const accomplishments = user.totalAccomplishmentType || { activity: 0, social: 0, meshctf: 0 };
    console.log(`\nCurrent Accomplishments:`);
    console.log(`  Activity: ${accomplishments.activity || 0}`);
    console.log(`  Social: ${accomplishments.social || 0}`);
    console.log(`  MeshCTF: ${accomplishments.meshctf || 0}`);

    let finalAwardType = awardType;
    let finalAwardValue = awardValue;

    // Interactive selection logic
    if (!awardType) {
      // No award type specified - show both tables and exit
      console.log('\n📋 Available Awards:');
      
      const ghosts = await fetchAllGhosts();
      const qrflags = await fetchAllQRFlags();
      
      if (ghosts.length > 0) {
        formatItemsInColumns(ghosts, 'ghost');
      }
      
      if (qrflags.length > 0) {
        formatItemsInColumns(qrflags, 'qrflag');
      }
      
      console.log('\n💡 Usage examples:');
      console.log(`  npm run award-accomplishment ${identifier} ghost <handle>`);
      console.log(`  npm run award-accomplishment ${identifier} qrflag <flag_id>`);
      console.log(`  npm run award-accomplishment ${identifier} ghost`);
      console.log(`  npm run award-accomplishment ${identifier} qrflag`);
      
      process.exit(0);
    }

    if (!finalAwardValue) {
      // No specific item specified - show interactive list
      if (finalAwardType === 'ghost') {
        const ghosts = await fetchAllGhosts();
        const selectedGhost = await selectFromList(ghosts, 'ghost');
        if (!selectedGhost) {
          console.log('❌ Award cancelled.');
          process.exit(0);
        }
        finalAwardValue = selectedGhost.id;
      } else if (finalAwardType === 'qrflag') {
        const qrflags = await fetchAllQRFlags();
        const selectedQRFlag = await selectFromList(qrflags, 'qrflag');
        if (!selectedQRFlag) {
          console.log('❌ Award cancelled.');
          process.exit(0);
        }
        finalAwardValue = selectedQRFlag.id;
      }
    }

    const awardTypeDisplay = finalAwardType === 'ghost' ? 'CTF Ghost Challenge' : 'QR Flag';
    console.log(`\n🎯 About to award: ${awardTypeDisplay} - ${finalAwardValue}`);
    
    const confirm = await askQuestion('\nProceed with awarding this accomplishment? (yes/NO): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Award cancelled.');
      process.exit(0);
    }

    let result;
    if (finalAwardType === 'ghost') {
      result = await awardGhost(user, finalAwardValue);
    } else {
      result = await awardQRFlag(user, finalAwardValue);
    }

    if (result) {
      console.log('\n✅ Accomplishment awarded successfully!');
      console.log(`Accomplishment ID: ${result.accomplishmentId}`);
      console.log(`Type: ${result.type}`);
      console.log(`Name: ${result.name}`);
      console.log(`Points: ${result.metadata?.points || 1}`);
    } else {
      console.log('❌ Failed to award accomplishment (likely duplicate)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);