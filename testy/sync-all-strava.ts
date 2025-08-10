#!/usr/bin/env ts-node

import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Entity } from 'electrodb';

// Import the sync function from the webapp
import { syncStravaActivitiesSmartForUser } from '../apps/nx/apps/webapp/src/db/strava';

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
      strava_account: {
        type: 'map',
        properties: {
          access_token: { type: 'string' },
          refresh_token: { type: 'string' },
          expires_at: { type: 'number' },
          expires_in: { type: 'number' },
          provider: { type: 'string' },
          providerAccountId: { type: 'number' },
          token_type: { type: 'string' },
          type: { type: 'string' },
          activities: { type: 'any' },
          last_activities_sync: { type: 'number' },
          sync_history: { type: 'any' },
          historical_sync_completed: { type: 'boolean' },
          athlete: {
            type: 'map',
            properties: {
              id: { type: 'any' },
              firstname: { type: 'any' },
              lastname: { type: 'any' },
              username: { type: 'any' },
            },
          },
        },
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

interface SyncResult {
  email: string;
  displayname: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  activitiesCount?: number;
  newActivities?: number;
  existingActivities?: number;
  accomplishmentsCreated?: number;
  syncType?: 'first-time' | 'current-year';
  error?: string;
}

async function getAllUsersWithStrava() {
  console.log('📊 Fetching all users with Strava connections...');
  
  const allUsers: any[] = [];
  let lastKey: any = null;
  
  do {
    const result: any = await User.scan.go({ cursor: lastKey });
    allUsers.push(...result.data);
    lastKey = result.cursor;
  } while (lastKey);
  
  // Filter to only users with Strava accounts
  const stravaUsers = allUsers.filter(user => 
    user.strava_account && 
    user.strava_account.access_token &&
    user.strava_account.refresh_token
  );
  
  console.log(`Found ${stravaUsers.length} users with Strava connections out of ${allUsers.length} total users`);
  
  return stravaUsers;
}

async function syncUserStrava(user: any): Promise<SyncResult> {
  const result: SyncResult = {
    email: user.email,
    displayname: user.displayname || 'N/A',
    status: 'skipped',
    message: '',
  };

  try {
    console.log(`\n🔄 Syncing Strava for ${user.email} (${user.displayname || 'N/A'})...`);
    
    // Perform the sync using the same function that the webapp uses
    const syncResult = await syncStravaActivitiesSmartForUser(user.email);
    
    result.status = 'success';
    result.activitiesCount = syncResult.activitiesCount;
    result.newActivities = syncResult.newActivities;
    result.existingActivities = syncResult.existingActivities;
    result.accomplishmentsCreated = syncResult.accomplishmentsCreated;
    result.syncType = syncResult.syncType;
    result.message = `Synced ${syncResult.newActivities} new activities (${syncResult.activitiesCount} total)`;
    
    console.log(`✅ Success: ${result.message}`);
    
  } catch (error: any) {
    result.status = 'failed';
    result.error = error.message || 'Unknown error';
    
    // Handle specific error cases
    if (error.message?.includes('rate limit exceeded')) {
      result.message = 'Rate limit exceeded';
      console.log(`⏸️  Skipped: ${result.message}`);
      result.status = 'skipped';
    } else if (error.message?.includes('No valid Strava account')) {
      result.message = 'Invalid Strava account';
      console.log(`❌ Failed: ${result.message}`);
    } else if (error.message?.includes('User not found')) {
      result.message = 'User not found';
      console.log(`❌ Failed: ${result.message}`);
    } else {
      result.message = `Error: ${error.message}`;
      console.log(`❌ Failed: ${result.message}`);
    }
  }
  
  return result;
}

function printSummaryReport(results: SyncResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 SYNC SUMMARY REPORT');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  const skipped = results.filter(r => r.status === 'skipped');
  
  console.log(`\n📈 Overall Statistics:`);
  console.log(`  Total Users Processed: ${results.length}`);
  console.log(`  ✅ Successful Syncs: ${successful.length}`);
  console.log(`  ❌ Failed Syncs: ${failed.length}`);
  console.log(`  ⏸️  Skipped (Rate Limited): ${skipped.length}`);
  
  if (successful.length > 0) {
    const totalNew = successful.reduce((sum, r) => sum + (r.newActivities || 0), 0);
    const totalActivities = successful.reduce((sum, r) => sum + (r.activitiesCount || 0), 0);
    const totalAccomplishments = successful.reduce((sum, r) => sum + (r.accomplishmentsCreated || 0), 0);
    const firstTimeSyncs = successful.filter(r => r.syncType === 'first-time').length;
    
    console.log(`\n🏃 Activity Statistics:`);
    console.log(`  Total New Activities Imported: ${totalNew}`);
    console.log(`  Total Activities Across All Users: ${totalActivities}`);
    console.log(`  Total Accomplishments Created: ${totalAccomplishments}`);
    console.log(`  First-Time Historical Syncs: ${firstTimeSyncs}`);
    console.log(`  Current Year Updates: ${successful.length - firstTimeSyncs}`);
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed Syncs:`);
    failed.forEach(r => {
      console.log(`  - ${r.email}: ${r.message}`);
    });
  }
  
  if (skipped.length > 0) {
    console.log(`\n⏸️  Rate Limited Users:`);
    skipped.forEach(r => {
      console.log(`  - ${r.email}: ${r.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
}

function saveReportToFile(results: SyncResult[]) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `sync-all-strava-report-${timestamp}.json`;
  
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalProcessed: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      totalNewActivities: results.reduce((sum, r) => sum + (r.newActivities || 0), 0),
      totalAccomplishments: results.reduce((sum, r) => sum + (r.accomplishmentsCreated || 0), 0),
    },
    details: results
  };
  
  require('fs').writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed report saved to: ${filename}`);
}

async function main() {
  console.log('🚀 Starting bulk Strava sync for all users...');
  console.log('⚠️  This will sync Strava activities for ALL users with connected accounts');
  
  // Add a delay to allow cancellation
  console.log('\nStarting in 3 seconds... (Press Ctrl+C to cancel)');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Get all users with Strava connections
    const users = await getAllUsersWithStrava();
    
    if (users.length === 0) {
      console.log('❌ No users with Strava connections found');
      return;
    }
    
    console.log(`\n🎯 Will attempt to sync ${users.length} users`);
    
    const results: SyncResult[] = [];
    
    // Process each user
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`\n[${i + 1}/${users.length}] Processing user...`);
      
      const result = await syncUserStrava(user);
      results.push(result);
      
      // Add a small delay between users to be nice to the API
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Print summary report
    printSummaryReport(results);
    
    // Save detailed report to file
    saveReportToFile(results);
    
    console.log('\n✅ Bulk Strava sync complete!');
    
  } catch (error) {
    console.error('❌ Fatal error during bulk sync:', error);
    process.exit(1);
  }
}

// Add command line arguments support
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Strava Bulk Sync Tool
--------------------
This tool syncs Strava activities for all users who have connected their Strava accounts.

Usage:
  npm run sync-all-strava        # Run the sync for all users
  npm run sync-all-strava --help # Show this help message

What it does:
  1. Fetches all users with Strava connections from the database
  2. For each user, executes the same sync logic as the "Sync to Strava" button
  3. Handles rate limiting and errors gracefully
  4. Generates a summary report of the sync results
  5. Saves a detailed JSON report to a file

Notes:
  - First-time users will get a full historical sync (all DEFCON years)
  - Returning users will get updates for the current year only
  - Users are subject to their daily sync quota limits
  - The tool adds delays between users to avoid overwhelming the API
  `);
  process.exit(0);
}

// Run the script
main().catch(console.error);