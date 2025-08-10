#!/usr/bin/env ts-node

import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Entity } from 'electrodb';

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

interface UserSummary {
  email: string;
  displayname: string;
  flagSummary: string;
  created: string;
  totalFlags: number;
  activity: number;
  social: number;
  meshctf: number;
}

async function getAllUsers(): Promise<UserSummary[]> {
  console.log('📊 Fetching all users...');
  
  // Paginate through ALL users - DynamoDB scan has 1MB limit per request
  const allUsers: any[] = [];
  let lastKey: any = null;
  let pageNum = 0;
  
  do {
    pageNum++;
    const result: any = await User.scan.go({ cursor: lastKey });
    allUsers.push(...result.data);
    lastKey = result.cursor;
    console.log(`  Page ${pageNum}: ${result.data.length} users, Total: ${allUsers.length}, HasMore: ${!!lastKey}`);
  } while (lastKey);
  
  console.log(`  Total users fetched: ${allUsers.length}`);
  
  const summaries: UserSummary[] = [];

  for (const user of allUsers) {
    const accomplishments = user.totalAccomplishmentType || { activity: 0, social: 0, meshctf: 0 };
    const activity = accomplishments.activity || 0;
    const social = accomplishments.social || 0;
    const meshctf = accomplishments.meshctf || 0;
    const totalFlags = activity + social + meshctf;

    summaries.push({
      email: user.email,
      displayname: user.displayname || 'N/A',
      flagSummary: `A:${activity} S:${social} M:${meshctf} T:${totalFlags}`,
      created: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : 'N/A',
      totalFlags,
      activity,
      social,
      meshctf
    });
  }

  return summaries.sort((a, b) => b.totalFlags - a.totalFlags || a.email.localeCompare(b.email));
}

function printAccountingReport(summaries: UserSummary[]) {
  console.log('\n📋 USER ACCOUNTING REPORT');
  console.log('=' .repeat(100));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('=' .repeat(100));
  
  // Header
  console.log('\n' + 'Email'.padEnd(40) + 'Display Name'.padEnd(25) + 'Flags (A/S/M/Total)'.padEnd(25) + 'Created');
  console.log('-'.repeat(100));

  // Data rows
  summaries.forEach((summary, index) => {
    const row = [
      summary.email.padEnd(40),
      summary.displayname.padEnd(25),
      summary.flagSummary.padEnd(25),
      summary.created
    ].join('');
    console.log(row);
  });

  // Footer statistics
  console.log('-'.repeat(100));
  
  const totals = summaries.reduce((acc, s) => ({
    users: acc.users + 1,
    activity: acc.activity + s.activity,
    social: acc.social + s.social,
    meshctf: acc.meshctf + s.meshctf,
    total: acc.total + s.totalFlags
  }), { users: 0, activity: 0, social: 0, meshctf: 0, total: 0 });

  console.log('\nSUMMARY STATISTICS');
  console.log('-'.repeat(50));
  console.log(`Total Users: ${totals.users}`);
  console.log(`Total Flags: ${totals.total} (Activity: ${totals.activity}, Social: ${totals.social}, MeshCTF: ${totals.meshctf})`);
  console.log(`Average Flags per User: ${(totals.total / totals.users).toFixed(2)}`);
  
  const usersWithFlagsCount = summaries.filter(s => s.totalFlags > 0).length;
  const usersWithoutFlagsCount = summaries.filter(s => s.totalFlags === 0).length;
  console.log(`Users with Flags: ${usersWithFlagsCount} (${((usersWithFlagsCount / totals.users) * 100).toFixed(1)}%)`);
  console.log(`Users without Flags: ${usersWithoutFlagsCount} (${((usersWithoutFlagsCount / totals.users) * 100).toFixed(1)}%)`);

  // Top performers (show all)
  const usersWithFlags = summaries.filter(s => s.totalFlags > 0);
  const usersWithoutFlags = summaries.filter(s => s.totalFlags === 0);
  
  if (usersWithFlags.length > 0) {
    console.log(`\nUSERS WITH ACCOMPLISHMENTS (${usersWithFlags.length})`);
    console.log('-'.repeat(80));
    usersWithFlags.forEach((s, i) => {
      console.log(`${(i + 1).toString().padStart(3)}. ${s.email.padEnd(40)} ${s.flagSummary.padEnd(20)} ${s.displayname}`);
    });
  }
  
  if (usersWithoutFlags.length > 0) {
    console.log(`\nUSERS WITHOUT ACCOMPLISHMENTS (${usersWithoutFlags.length})`);
    console.log('-'.repeat(80));
    usersWithoutFlags.forEach((s, i) => {
      console.log(`${(i + 1).toString().padStart(3)}. ${s.email.padEnd(40)} ${s.flagSummary.padEnd(20)} ${s.displayname}`);
    });
  }
}

function saveCSV(summaries: UserSummary[]) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `user-summary-${timestamp}.csv`;
  
  const csv = [
    'Email,Display Name,Activity,Social,MeshCTF,Total Flags,Created',
    ...summaries.map(s => 
      `"${s.email}","${s.displayname}",${s.activity},${s.social},${s.meshctf},${s.totalFlags},${s.created}`
    )
  ].join('\n');

  require('fs').writeFileSync(filename, csv);
  console.log(`\n💾 CSV report saved to: ${filename}`);
}

async function main() {
  try {
    console.log('🚀 Starting user summary report generation...');
    
    const summaries = await getAllUsers();
    printAccountingReport(summaries);
    saveCSV(summaries);
    
    console.log('\n✅ User summary report complete!');
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);