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
      quota: {
        type: 'map',
        properties: {
          qrSheet: { type: 'number' },
          displaynameChanges: { type: 'number' },
          displaynameChangesResetDate: { type: 'string' },
          stravaSync: { type: 'number' },
          qrScans: { type: 'number' },
          flagChecks: { type: 'number' },
        },
        default: () => ({ 
          qrSheet: 10,
          displaynameChanges: 3,
          displaynameChangesResetDate: new Date().toISOString().split('T')[0],
          stravaSync: 16,
          qrScans: 0,
          flagChecks: 0
        }),
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

interface QuotaReport {
  email: string;
  displayname: string;
  name: string;
  qrSheet: number;
  displaynameChanges: number;
  displaynameChangesResetDate: string;
  stravaSync: number;
  qrScans: number;
  flagChecks: number;
  createdAt: string;
}

async function getAllUsers(): Promise<QuotaReport[]> {
  console.log('📊 Fetching all users and their quotas...');
  
  const users = await User.scan.go();
  const quotaReports: QuotaReport[] = [];

  for (const user of users.data) {
    const quota = user.quota || {
      qrSheet: 10,
      displaynameChanges: 3,
      displaynameChangesResetDate: new Date().toISOString().split('T')[0],
      stravaSync: 16,
      qrScans: 0,
      flagChecks: 0
    };

    quotaReports.push({
      email: user.email,
      displayname: user.displayname || 'N/A',
      name: user.name || 'N/A',
      qrSheet: quota.qrSheet ?? 10,
      displaynameChanges: quota.displaynameChanges ?? 3,
      displaynameChangesResetDate: quota.displaynameChangesResetDate || 'N/A',
      stravaSync: quota.stravaSync ?? 16,
      qrScans: quota.qrScans ?? 0,
      flagChecks: quota.flagChecks ?? 0,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : 'N/A',
    });
  }

  return quotaReports.sort((a, b) => a.email.localeCompare(b.email));
}

function generateSummaryStats(reports: QuotaReport[]) {
  const stats = {
    totalUsers: reports.length,
    qrSheet: {
      total: reports.reduce((sum, r) => sum + r.qrSheet, 0),
      average: 0,
      min: Math.min(...reports.map(r => r.qrSheet)),
      max: Math.max(...reports.map(r => r.qrSheet)),
    },
    stravaSync: {
      total: reports.reduce((sum, r) => sum + r.stravaSync, 0),
      average: 0,
      min: Math.min(...reports.map(r => r.stravaSync)),
      max: Math.max(...reports.map(r => r.stravaSync)),
    },
    qrScans: {
      total: reports.reduce((sum, r) => sum + r.qrScans, 0),
      average: 0,
      min: Math.min(...reports.map(r => r.qrScans)),
      max: Math.max(...reports.map(r => r.qrScans)),
    },
    flagChecks: {
      total: reports.reduce((sum, r) => sum + r.flagChecks, 0),
      average: 0,
      min: Math.min(...reports.map(r => r.flagChecks)),
      max: Math.max(...reports.map(r => r.flagChecks)),
    },
    displaynameChanges: {
      total: reports.reduce((sum, r) => sum + r.displaynameChanges, 0),
      average: 0,
      min: Math.min(...reports.map(r => r.displaynameChanges)),
      max: Math.max(...reports.map(r => r.displaynameChanges)),
    }
  };

  stats.qrSheet.average = Math.round((stats.qrSheet.total / stats.totalUsers) * 100) / 100;
  stats.stravaSync.average = Math.round((stats.stravaSync.total / stats.totalUsers) * 100) / 100;
  stats.qrScans.average = Math.round((stats.qrScans.total / stats.totalUsers) * 100) / 100;
  stats.flagChecks.average = Math.round((stats.flagChecks.total / stats.totalUsers) * 100) / 100;
  stats.displaynameChanges.average = Math.round((stats.displaynameChanges.total / stats.totalUsers) * 100) / 100;

  return stats;
}

function printReport(reports: QuotaReport[], stats: any) {
  console.log('\n🎯 USER QUOTA REPORT');
  console.log('=' .repeat(120));
  
  console.log('\n📈 SUMMARY STATISTICS');
  console.log('-'.repeat(50));
  console.log(`Total Users: ${stats.totalUsers}`);
  console.log(`\nQR Sheet Quota:`);
  console.log(`  Total: ${stats.qrSheet.total} | Average: ${stats.qrSheet.average} | Min: ${stats.qrSheet.min} | Max: ${stats.qrSheet.max}`);
  console.log(`Strava Sync Quota:`);
  console.log(`  Total: ${stats.stravaSync.total} | Average: ${stats.stravaSync.average} | Min: ${stats.stravaSync.min} | Max: ${stats.stravaSync.max}`);
  console.log(`QR Scans Used:`);
  console.log(`  Total: ${stats.qrScans.total} | Average: ${stats.qrScans.average} | Min: ${stats.qrScans.min} | Max: ${stats.qrScans.max}`);
  console.log(`Flag Checks Used:`);
  console.log(`  Total: ${stats.flagChecks.total} | Average: ${stats.flagChecks.average} | Min: ${stats.flagChecks.min} | Max: ${stats.flagChecks.max}`);
  console.log(`Display Name Changes:`);
  console.log(`  Total: ${stats.displaynameChanges.total} | Average: ${stats.displaynameChanges.average} | Min: ${stats.displaynameChanges.min} | Max: ${stats.displaynameChanges.max}`);

  console.log('\n👥 DETAILED USER QUOTAS');
  console.log('-'.repeat(120));
  console.log('Email'.padEnd(35) + 'Display Name'.padEnd(25) + 'QR Sheet'.padEnd(10) + 'Strava'.padEnd(8) + 'QR Scans'.padEnd(10) + 'Flag Checks'.padEnd(12) + 'Name Changes'.padEnd(13) + 'Created');
  console.log('-'.repeat(120));

  reports.forEach(report => {
    const line = [
      report.email.padEnd(35),
      (report.displayname || 'N/A').padEnd(25),
      report.qrSheet.toString().padEnd(10),
      report.stravaSync.toString().padEnd(8),
      report.qrScans.toString().padEnd(10),
      report.flagChecks.toString().padEnd(12),
      report.displaynameChanges.toString().padEnd(13),
      report.createdAt
    ].join('');
    console.log(line);
  });

  console.log('\n🔍 QUOTA USAGE INSIGHTS');
  console.log('-'.repeat(50));
  const lowQrSheet = reports.filter(r => r.qrSheet < 5).length;
  const lowStravaSync = reports.filter(r => r.stravaSync < 8).length;
  const highQrScans = reports.filter(r => r.qrScans > 50).length;
  const highFlagChecks = reports.filter(r => r.flagChecks > 20).length;
  
  console.log(`Users with low QR Sheet quota (<5): ${lowQrSheet}`);
  console.log(`Users with low Strava Sync quota (<8): ${lowStravaSync}`);
  console.log(`Users with high QR Scan usage (>50): ${highQrScans}`);
  console.log(`Users with high Flag Check usage (>20): ${highFlagChecks}`);
}

function saveReportToFile(reports: QuotaReport[], stats: any) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `quota-report-${timestamp}.json`;
  
  const reportData = {
    generatedAt: new Date().toISOString(),
    summary: stats,
    users: reports
  };

  require('fs').writeFileSync(filename, JSON.stringify(reportData, null, 2));
  console.log(`\n💾 Report saved to: ${filename}`);
}

async function main() {
  try {
    console.log('🚀 Starting quota report generation...');
    
    const reports = await getAllUsers();
    const stats = generateSummaryStats(reports);
    
    printReport(reports, stats);
    saveReportToFile(reports, stats);
    
    console.log('\n✅ Quota report generation complete!');
    
  } catch (error) {
    console.error('❌ Error generating quota report:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);