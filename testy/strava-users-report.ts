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
      strava_profile: {
        type: 'map',
        properties: {
          id: { type: 'any' },
          firstname: { type: 'any' },
          lastname: { type: 'any' },
          username: { type: 'any' },
          city: { type: 'any' },
          state: { type: 'any' },
          country: { type: 'any' },
          created_at: { type: 'any' },
          updated_at: { type: 'any' },
        },
      },
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
      quota: {
        type: 'map',
        properties: {
          stravaSync: { type: 'number' },
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

interface StravaUserReport {
  email: string;
  displayname: string;
  name: string;
  stravaId: string;
  stravaUsername: string;
  stravaName: string;
  lastSync: string;
  lastSyncDaysAgo: number;
  syncQuotaRemaining: number;
  tokenExpiry: string;
  tokenExpired: boolean;
  historicalSyncCompleted: boolean;
  totalSyncs: number;
  activitiesCount: number;
  accountCreated: string;
}

async function getAllStravaUsers(): Promise<StravaUserReport[]> {
  console.log('📊 Fetching all users and filtering for Strava connections...');
  
  const users = await User.scan.go();
  const stravaUsers: StravaUserReport[] = [];

  for (const user of users.data) {
    // Only include users with Strava accounts
    if (!user.strava_account || !user.strava_account.access_token) {
      continue;
    }

    const stravaAccount = user.strava_account;
    const stravaProfile = user.strava_profile || {};
    const athlete = stravaAccount.athlete || {};

    // Calculate last sync info
    const lastSyncTimestamp = stravaAccount.last_activities_sync;
    const lastSyncDate = lastSyncTimestamp ? new Date(lastSyncTimestamp) : null;
    const lastSyncString = lastSyncDate ? lastSyncDate.toISOString().split('T')[0] : 'Never';
    const lastSyncDaysAgo = lastSyncDate ? Math.floor((Date.now() - lastSyncTimestamp) / (1000 * 60 * 60 * 24)) : -1;

    // Token expiry info
    const tokenExpiryTimestamp = stravaAccount.expires_at;
    const tokenExpiryDate = tokenExpiryTimestamp ? new Date(tokenExpiryTimestamp * 1000) : null;
    const tokenExpiryString = tokenExpiryDate ? tokenExpiryDate.toISOString().split('T')[0] : 'Unknown';
    const tokenExpired = tokenExpiryDate ? tokenExpiryDate < new Date() : false;

    // Sync history info
    const syncHistory = stravaAccount.sync_history || [];
    const totalSyncs = Array.isArray(syncHistory) ? syncHistory.length : 0;

    // Activities count
    const activities = stravaAccount.activities || {};
    const activitiesCount = typeof activities === 'object' ? Object.keys(activities).length : 0;

    // Quota info
    const stravaQuota = user.quota?.stravaSync ?? 16;

    // Get Strava names/usernames
    const stravaId = String(athlete.id || stravaProfile.id || 'Unknown');
    const stravaUsername = athlete.username || stravaProfile.username || 'N/A';
    const stravaFirstName = athlete.firstname || stravaProfile.firstname || '';
    const stravaLastName = athlete.lastname || stravaProfile.lastname || '';
    const stravaName = `${stravaFirstName} ${stravaLastName}`.trim() || 'N/A';

    stravaUsers.push({
      email: user.email,
      displayname: user.displayname || 'N/A',
      name: user.name || 'N/A',
      stravaId,
      stravaUsername,
      stravaName,
      lastSync: lastSyncString,
      lastSyncDaysAgo,
      syncQuotaRemaining: stravaQuota,
      tokenExpiry: tokenExpiryString,
      tokenExpired,
      historicalSyncCompleted: stravaAccount.historical_sync_completed || false,
      totalSyncs,
      activitiesCount,
      accountCreated: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : 'N/A',
    });
  }

  // Sort by last sync (most recent first), then by email
  return stravaUsers.sort((a, b) => {
    if (a.lastSyncDaysAgo === -1 && b.lastSyncDaysAgo === -1) return a.email.localeCompare(b.email);
    if (a.lastSyncDaysAgo === -1) return 1;
    if (b.lastSyncDaysAgo === -1) return -1;
    return a.lastSyncDaysAgo - b.lastSyncDaysAgo;
  });
}

function generateSummaryStats(reports: StravaUserReport[]) {
  const stats = {
    totalStravaUsers: reports.length,
    neverSynced: reports.filter(r => r.lastSyncDaysAgo === -1).length,
    syncedToday: reports.filter(r => r.lastSyncDaysAgo === 0).length,
    syncedThisWeek: reports.filter(r => r.lastSyncDaysAgo >= 0 && r.lastSyncDaysAgo <= 7).length,
    syncedThisMonth: reports.filter(r => r.lastSyncDaysAgo >= 0 && r.lastSyncDaysAgo <= 30).length,
    staleSync: reports.filter(r => r.lastSyncDaysAgo > 30).length,
    expiredTokens: reports.filter(r => r.tokenExpired).length,
    historicalSyncCompleted: reports.filter(r => r.historicalSyncCompleted).length,
    totalActivities: reports.reduce((sum, r) => sum + r.activitiesCount, 0),
    totalSyncs: reports.reduce((sum, r) => sum + r.totalSyncs, 0),
    averageQuotaRemaining: Math.round((reports.reduce((sum, r) => sum + r.syncQuotaRemaining, 0) / reports.length) * 100) / 100,
  };

  return stats;
}

function printReport(reports: StravaUserReport[], stats: any) {
  console.log('\n🏃 STRAVA USERS REPORT');
  console.log('=' .repeat(140));
  
  console.log('\n📈 SUMMARY STATISTICS');
  console.log('-'.repeat(50));
  console.log(`Total Strava Users: ${stats.totalStravaUsers}`);
  console.log(`Never Synced: ${stats.neverSynced}`);
  console.log(`Synced Today: ${stats.syncedToday}`);
  console.log(`Synced This Week: ${stats.syncedThisWeek}`);
  console.log(`Synced This Month: ${stats.syncedThisMonth}`);
  console.log(`Stale Syncs (>30 days): ${stats.staleSync}`);
  console.log(`Expired Tokens: ${stats.expiredTokens}`);
  console.log(`Historical Sync Completed: ${stats.historicalSyncCompleted}`);
  console.log(`Total Activities Imported: ${stats.totalActivities}`);
  console.log(`Total Sync Operations: ${stats.totalSyncs}`);
  console.log(`Average Quota Remaining: ${stats.averageQuotaRemaining}`);

  console.log('\n👥 DETAILED STRAVA USERS');
  console.log('-'.repeat(140));
  const header = [
    'Email'.padEnd(35),
    'Display Name'.padEnd(20),
    'Strava Name'.padEnd(25),
    'Last Sync'.padEnd(12),
    'Days Ago'.padEnd(9),
    'Activities'.padEnd(10),
    'Quota'.padEnd(6),
    'Token OK'.padEnd(8),
    'Hist.Sync'.padEnd(9)
  ].join('');
  console.log(header);
  console.log('-'.repeat(140));

  reports.forEach(report => {
    const line = [
      report.email.padEnd(35),
      (report.displayname || 'N/A').padEnd(20),
      report.stravaName.padEnd(25),
      report.lastSync.padEnd(12),
      (report.lastSyncDaysAgo === -1 ? 'Never' : report.lastSyncDaysAgo.toString()).padEnd(9),
      report.activitiesCount.toString().padEnd(10),
      report.syncQuotaRemaining.toString().padEnd(6),
      (report.tokenExpired ? '❌' : '✅').padEnd(8),
      (report.historicalSyncCompleted ? '✅' : '❌').padEnd(9)
    ].join('');
    console.log(line);
  });

  console.log('\n🔍 SYNC HEALTH INSIGHTS');
  console.log('-'.repeat(50));
  if (stats.expiredTokens > 0) {
    console.log(`⚠️  ${stats.expiredTokens} users have expired Strava tokens and need to reconnect`);
  }
  if (stats.neverSynced > 0) {
    console.log(`⚠️  ${stats.neverSynced} users have never performed a sync`);
  }
  if (stats.staleSync > 0) {
    console.log(`⚠️  ${stats.staleSync} users haven't synced in over 30 days`);
  }
  const incompleteHistorical = stats.totalStravaUsers - stats.historicalSyncCompleted;
  if (incompleteHistorical > 0) {
    console.log(`ℹ️  ${incompleteHistorical} users haven't completed their initial historical sync`);
  }
  
  console.log(`\n📊 Sync Distribution:`);
  console.log(`  Never: ${stats.neverSynced} | Today: ${stats.syncedToday} | Week: ${stats.syncedThisWeek} | Month: ${stats.syncedThisMonth} | Stale: ${stats.staleSync}`);
}

function saveReportToFile(reports: StravaUserReport[], stats: any) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // JSON Report
  const jsonFilename = `strava-users-report-${timestamp}.json`;
  const reportData = {
    generatedAt: new Date().toISOString(),
    summary: stats,
    users: reports
  };
  require('fs').writeFileSync(jsonFilename, JSON.stringify(reportData, null, 2));
  console.log(`\n💾 JSON report saved to: ${jsonFilename}`);

  // CSV Report
  const csvFilename = `strava-users-report-${timestamp}.csv`;
  const csv = [
    'Email,Display Name,User Name,Strava ID,Strava Username,Strava Name,Last Sync,Days Since Last Sync,Activities Count,Sync Quota Remaining,Token Expired,Historical Sync Completed,Total Syncs,Account Created',
    ...reports.map(r => 
      `"${r.email}","${r.displayname}","${r.name}","${r.stravaId}","${r.stravaUsername}","${r.stravaName}","${r.lastSync}",${r.lastSyncDaysAgo},${r.activitiesCount},${r.syncQuotaRemaining},${r.tokenExpired},${r.historicalSyncCompleted},${r.totalSyncs},"${r.accountCreated}"`
    )
  ].join('\n');
  require('fs').writeFileSync(csvFilename, csv);
  console.log(`💾 CSV report saved to: ${csvFilename}`);
}

async function main() {
  try {
    console.log('🚀 Starting Strava users report generation...');
    
    const reports = await getAllStravaUsers();
    
    if (reports.length === 0) {
      console.log('❌ No Strava users found in the database');
      return;
    }

    const stats = generateSummaryStats(reports);
    
    printReport(reports, stats);
    saveReportToFile(reports, stats);
    
    console.log('\n✅ Strava users report generation complete!');
    
  } catch (error) {
    console.error('❌ Error generating Strava users report:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);