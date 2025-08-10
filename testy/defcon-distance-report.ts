#!/usr/bin/env ts-node

import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Entity } from 'electrodb';
import * as fs from 'fs';

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

interface DefconStats {
  defcon: number;
  year: number;
  totalDistanceMeters: number;
  totalDistanceKm: number;
  totalDistanceMiles: number;
  totalSteps: number;
  activitiesCount: number;
  runnersCount: number;
  runners: Set<string>;
}

// Calculate steps from distance (rough estimate: 1 step = 0.762 meters or 2.5 feet)
function metersToSteps(meters: number): number {
  return Math.round(meters / 0.762);
}

function metersToKm(meters: number): number {
  return meters / 1000;
}

function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

async function getAllAccomplishments() {
  console.log('📊 Fetching all accomplishments...');
  
  const allAccomplishments: any[] = [];
  let cursor: string | undefined = undefined;
  
  do {
    const result: any = await Accomplishments.scan.go({ 
      cursor,
      limit: 1000
    });
    
    allAccomplishments.push(...result.data);
    cursor = result.cursor;
    
    console.log(`  Fetched ${result.data.length} accomplishments (total so far: ${allAccomplishments.length})`);
  } while (cursor);
  
  console.log(`  Total accomplishments fetched: ${allAccomplishments.length}`);
  return allAccomplishments;
}

async function getAllUsers() {
  console.log('📊 Fetching all users...');
  
  const allUsers: any[] = [];
  let cursor: any = null;
  
  do {
    const result: any = await User.scan.go({ cursor });
    allUsers.push(...result.data);
    cursor = result.cursor;
  } while (cursor);
  
  console.log(`  Total users fetched: ${allUsers.length}`);
  return allUsers;
}

async function generateDefconDistanceReport() {
  try {
    console.log('🚀 Starting DEFCON Distance Report Generation...');
    console.log('=' .repeat(80));
    
    // Get all users for mapping
    const users = await getAllUsers();
    const userMap = new Map<string, any>();
    users.forEach(user => userMap.set(user.id, user));
    
    // Get all accomplishments
    const accomplishments = await getAllAccomplishments();
    
    // Filter for activity type accomplishments with distance data
    const activityAccomplishments = accomplishments.filter(acc => 
      acc.type === 'activity' && acc.metadata?.distance
    );
    
    console.log(`\n📈 Found ${activityAccomplishments.length} activity accomplishments with distance data`);
    
    // Group by DEFCON year
    const defconStats = new Map<number, DefconStats>();
    
    activityAccomplishments.forEach(acc => {
      const year = acc.year;
      const defconNumber = year - 1992; // DEFCON 1 was in 1993
      
      if (!defconStats.has(defconNumber)) {
        defconStats.set(defconNumber, {
          defcon: defconNumber,
          year: year,
          totalDistanceMeters: 0,
          totalDistanceKm: 0,
          totalDistanceMiles: 0,
          totalSteps: 0,
          activitiesCount: 0,
          runnersCount: 0,
          runners: new Set<string>()
        });
      }
      
      const stats = defconStats.get(defconNumber)!;
      const distanceMeters = parseFloat(acc.metadata.distance) || 0;
      
      stats.totalDistanceMeters += distanceMeters;
      stats.activitiesCount++;
      stats.runners.add(acc.userId);
    });
    
    // Calculate final values and sort by DEFCON number
    const sortedStats = Array.from(defconStats.values())
      .map(stats => ({
        ...stats,
        totalDistanceKm: metersToKm(stats.totalDistanceMeters),
        totalDistanceMiles: metersToMiles(stats.totalDistanceMeters),
        totalSteps: metersToSteps(stats.totalDistanceMeters),
        runnersCount: stats.runners.size
      }))
      .sort((a, b) => b.defcon - a.defcon); // Sort by most recent DEFCON first
    
    // Print report
    console.log('\n' + '=' .repeat(100));
    console.log('DEFCON DISTANCE REPORT - ALL RUNNERS ACCOMPLISHMENTS');
    console.log('=' .repeat(100));
    console.log(`Generated: ${new Date().toISOString()}`);
    console.log('=' .repeat(100));
    
    console.log('\n' + 'DEFCON'.padEnd(10) + 
                'Year'.padEnd(8) + 
                'Runners'.padEnd(10) +
                'Activities'.padEnd(12) +
                'Kilometers'.padEnd(15) + 
                'Miles'.padEnd(15) + 
                'Steps (est.)'.padEnd(15));
    console.log('-'.repeat(95));
    
    let grandTotalMeters = 0;
    let grandTotalActivities = 0;
    const allRunners = new Set<string>();
    
    sortedStats.forEach(stats => {
      const row = [
        `DC${stats.defcon}`.padEnd(10),
        stats.year.toString().padEnd(8),
        stats.runnersCount.toString().padEnd(10),
        stats.activitiesCount.toString().padEnd(12),
        stats.totalDistanceKm.toFixed(2).padEnd(15),
        stats.totalDistanceMiles.toFixed(2).padEnd(15),
        stats.totalSteps.toLocaleString().padEnd(15)
      ].join('');
      
      console.log(row);
      
      grandTotalMeters += stats.totalDistanceMeters;
      grandTotalActivities += stats.activitiesCount;
      stats.runners.forEach(runner => allRunners.add(runner));
    });
    
    // Print totals
    console.log('-'.repeat(95));
    const grandTotalKm = metersToKm(grandTotalMeters);
    const grandTotalMiles = metersToMiles(grandTotalMeters);
    const grandTotalSteps = metersToSteps(grandTotalMeters);
    
    const totalsRow = [
      'TOTAL'.padEnd(10),
      ''.padEnd(8),
      allRunners.size.toString().padEnd(10),
      grandTotalActivities.toString().padEnd(12),
      grandTotalKm.toFixed(2).padEnd(15),
      grandTotalMiles.toFixed(2).padEnd(15),
      grandTotalSteps.toLocaleString().padEnd(15)
    ].join('');
    
    console.log(totalsRow);
    console.log('=' .repeat(95));
    
    // Additional statistics
    console.log('\nSUMMARY STATISTICS');
    console.log('-'.repeat(50));
    console.log(`Total Unique Runners: ${allRunners.size}`);
    console.log(`Total Activities: ${grandTotalActivities}`);
    console.log(`Total Distance: ${grandTotalKm.toFixed(2)} km / ${grandTotalMiles.toFixed(2)} miles`);
    console.log(`Total Estimated Steps: ${grandTotalSteps.toLocaleString()}`);
    
    if (allRunners.size > 0) {
      console.log(`Average Distance per Runner: ${(grandTotalKm / allRunners.size).toFixed(2)} km`);
    }
    if (grandTotalActivities > 0) {
      console.log(`Average Distance per Activity: ${(grandTotalKm / grandTotalActivities).toFixed(2)} km`);
    }
    
    // Save to CSV
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `defcon-distance-report-${timestamp}.csv`;
    
    const csv = [
      'DEFCON,Year,Runners,Activities,Kilometers,Miles,Steps',
      ...sortedStats.map(s => 
        `DC${s.defcon},${s.year},${s.runnersCount},${s.activitiesCount},${s.totalDistanceKm.toFixed(2)},${s.totalDistanceMiles.toFixed(2)},${s.totalSteps}`
      ),
      `TOTAL,,${allRunners.size},${grandTotalActivities},${grandTotalKm.toFixed(2)},${grandTotalMiles.toFixed(2)},${grandTotalSteps}`
    ].join('\n');
    
    fs.writeFileSync(filename, csv);
    console.log(`\n💾 CSV report saved to: ${filename}`);
    
    console.log('\n✅ DEFCON Distance Report Complete!');
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
    process.exit(1);
  }
}

// Run the report
generateDefconDistanceReport().catch(console.error);