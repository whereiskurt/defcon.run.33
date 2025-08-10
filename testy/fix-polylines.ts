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
          source: { type: 'string' },
          upload_method: { type: 'string' },
          distance_km: { type: 'number' },
          moving_time_minutes: { type: 'number' },
          polyline: { type: 'string' },
          start_location: { type: 'list', items: { type: 'number' } },
          end_location: { type: 'list', items: { type: 'number' } },
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

interface PolylineStats {
  totalAccomplishments: number;
  activityAccomplishments: number;
  withPolyline: number;
  withoutPolyline: number;
  withStartEnd: number;
  withoutStartEnd: number;
  fixed: number;
  errors: number;
}

// Simple polyline encoder for lat/lng coordinates
function encodePolyline(coordinates: [number, number][]): string {
  if (!coordinates || coordinates.length === 0) {
    return '';
  }

  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of coordinates) {
    // Scale to 5 decimal places
    const scaledLat = Math.round(lat * 1e5);
    const scaledLng = Math.round(lng * 1e5);

    // Calculate deltas
    const deltaLat = scaledLat - prevLat;
    const deltaLng = scaledLng - prevLng;

    prevLat = scaledLat;
    prevLng = scaledLng;

    // Encode each delta
    encoded += encodeSignedNumber(deltaLat);
    encoded += encodeSignedNumber(deltaLng);
  }

  return encoded;
}

function encodeSignedNumber(num: number): string {
  // Left shift and invert if negative
  let sgn_num = num << 1;
  if (num < 0) {
    sgn_num = ~sgn_num;
  }

  let encoded = '';
  while (sgn_num >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgn_num & 0x1f)) + 63);
    sgn_num >>= 5;
  }
  encoded += String.fromCharCode(sgn_num + 63);
  
  return encoded;
}

// Generate a simple polyline from start and end points
function generateSimplePolyline(start: [number, number], end: [number, number]): string {
  // Create a simple line with a few intermediate points
  const points: [number, number][] = [];
  const steps = 10;
  
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const lat = start[0] + (end[0] - start[0]) * ratio;
    const lng = start[1] + (end[1] - start[1]) * ratio;
    points.push([lat, lng]);
  }
  
  // Return as JSON array for compatibility with existing code
  return JSON.stringify(points);
}

async function getAllActivityAccomplishments() {
  console.log('📊 Fetching all activity accomplishments...');
  
  const allAccomplishments: any[] = [];
  let cursor: string | undefined = undefined;
  
  do {
    const result: any = await Accomplishments.scan
      .where(({ type }, { eq }) => eq(type, 'activity'))
      .go({ 
        cursor,
        limit: 1000
      });
    
    allAccomplishments.push(...result.data);
    cursor = result.cursor;
    
    console.log(`  Fetched ${result.data.length} accomplishments (total so far: ${allAccomplishments.length})`);
  } while (cursor);
  
  console.log(`  Total activity accomplishments fetched: ${allAccomplishments.length}`);
  return allAccomplishments;
}

async function updateAccomplishmentPolyline(
  userId: string,
  accomplishmentId: string,
  polyline: string,
  summary_polyline?: string
) {
  try {
    const updates: any = {
      metadata: {
        polyline: polyline
      }
    };
    
    if (summary_polyline) {
      updates.metadata.summary_polyline = summary_polyline;
    }
    
    await Accomplishments.patch({
      userId,
      accomplishmentId,
    })
      .set(updates)
      .go();
    
    return true;
  } catch (error) {
    console.error(`Error updating accomplishment ${accomplishmentId}:`, error);
    return false;
  }
}

async function fixMissingPolylines() {
  try {
    console.log('🚀 Starting Polyline Fix Process...');
    console.log('=' .repeat(80));
    
    const stats: PolylineStats = {
      totalAccomplishments: 0,
      activityAccomplishments: 0,
      withPolyline: 0,
      withoutPolyline: 0,
      withStartEnd: 0,
      withoutStartEnd: 0,
      fixed: 0,
      errors: 0
    };
    
    // Get all accomplishments
    const accomplishments = await getAllActivityAccomplishments();
    stats.activityAccomplishments = accomplishments.length;
    
    console.log('\n🔍 Analyzing accomplishments for missing polylines...');
    
    const toFix: any[] = [];
    
    for (const acc of accomplishments) {
      const hasPolyline = acc.metadata?.polyline || acc.metadata?.summary_polyline;
      const hasStartEnd = (acc.metadata?.start_latlng || acc.metadata?.start_location) && 
                         (acc.metadata?.end_latlng || acc.metadata?.end_location);
      
      if (hasPolyline) {
        stats.withPolyline++;
      } else {
        stats.withoutPolyline++;
        
        if (hasStartEnd) {
          stats.withStartEnd++;
          toFix.push(acc);
        } else {
          stats.withoutStartEnd++;
        }
      }
    }
    
    console.log('\n📈 Analysis Results:');
    console.log(`  Total activity accomplishments: ${stats.activityAccomplishments}`);
    console.log(`  With polyline: ${stats.withPolyline}`);
    console.log(`  Without polyline: ${stats.withoutPolyline}`);
    console.log(`    - With start/end coordinates: ${stats.withStartEnd} (can be fixed)`);
    console.log(`    - Without coordinates: ${stats.withoutStartEnd} (cannot be fixed)`);
    
    if (toFix.length === 0) {
      console.log('\n✅ No accomplishments need fixing!');
      return;
    }
    
    console.log(`\n🔧 Fixing ${toFix.length} accomplishments with missing polylines...`);
    
    for (let i = 0; i < toFix.length; i++) {
      const acc = toFix[i];
      
      // Get start and end coordinates
      const start = acc.metadata?.start_latlng || acc.metadata?.start_location;
      const end = acc.metadata?.end_latlng || acc.metadata?.end_location;
      
      if (!start || !end) {
        console.log(`  ⚠️  Skipping ${acc.accomplishmentId} - missing coordinates`);
        stats.errors++;
        continue;
      }
      
      // Generate a simple polyline
      const polyline = generateSimplePolyline(
        [start[0], start[1]],
        [end[0], end[1]]
      );
      
      // Also create an encoded polyline for compatibility
      const encodedPolyline = encodePolyline([
        [start[0], start[1]],
        [end[0], end[1]]
      ]);
      
      // Update the accomplishment
      const success = await updateAccomplishmentPolyline(
        acc.userId,
        acc.accomplishmentId,
        polyline,
        encodedPolyline
      );
      
      if (success) {
        stats.fixed++;
        if ((i + 1) % 10 === 0) {
          console.log(`  ✅ Fixed ${i + 1}/${toFix.length} accomplishments...`);
        }
      } else {
        stats.errors++;
        console.log(`  ❌ Failed to fix ${acc.accomplishmentId}`);
      }
    }
    
    // Print final report
    console.log('\n' + '=' .repeat(80));
    console.log('POLYLINE FIX REPORT');
    console.log('=' .repeat(80));
    console.log(`Generated: ${new Date().toISOString()}`);
    console.log('=' .repeat(80));
    
    console.log('\nFINAL STATISTICS:');
    console.log(`  Total accomplishments processed: ${stats.activityAccomplishments}`);
    console.log(`  Successfully fixed: ${stats.fixed}`);
    console.log(`  Errors: ${stats.errors}`);
    console.log(`  Already had polylines: ${stats.withPolyline}`);
    console.log(`  Cannot be fixed (no coordinates): ${stats.withoutStartEnd}`);
    
    const successRate = toFix.length > 0 ? ((stats.fixed / toFix.length) * 100).toFixed(1) : '0';
    console.log(`\n  Success rate: ${successRate}%`);
    
    // Save report to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `polyline-fix-report-${timestamp}.json`;
    
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      fixedCount: stats.fixed,
      errorCount: stats.errors,
      successRate: `${successRate}%`
    };
    
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${filename}`);
    
    console.log('\n✅ Polyline Fix Process Complete!');
    
  } catch (error) {
    console.error('❌ Error in polyline fix process:', error);
    process.exit(1);
  }
}

// Add dry-run mode
async function analyzePolylines() {
  try {
    console.log('🚀 Starting Polyline Analysis (Dry Run)...');
    console.log('=' .repeat(80));
    
    const accomplishments = await getAllActivityAccomplishments();
    
    const analysis = {
      total: accomplishments.length,
      withPolyline: 0,
      withSummaryPolyline: 0,
      withBoth: 0,
      withNone: 0,
      withStartEnd: 0,
      fixable: 0,
      bySource: {} as Record<string, number>,
      byYear: {} as Record<number, { total: number; withPolyline: number; without: number }>
    };
    
    for (const acc of accomplishments) {
      const hasPolyline = !!acc.metadata?.polyline;
      const hasSummaryPolyline = !!acc.metadata?.summary_polyline;
      const hasStartEnd = (acc.metadata?.start_latlng || acc.metadata?.start_location) && 
                         (acc.metadata?.end_latlng || acc.metadata?.end_location);
      const source = acc.metadata?.source || 'unknown';
      
      if (hasPolyline) analysis.withPolyline++;
      if (hasSummaryPolyline) analysis.withSummaryPolyline++;
      if (hasPolyline && hasSummaryPolyline) analysis.withBoth++;
      if (!hasPolyline && !hasSummaryPolyline) {
        analysis.withNone++;
        if (hasStartEnd) {
          analysis.fixable++;
        }
      }
      if (hasStartEnd) analysis.withStartEnd++;
      
      // Track by source
      analysis.bySource[source] = (analysis.bySource[source] || 0) + 1;
      
      // Track by year
      const year = acc.year;
      if (!analysis.byYear[year]) {
        analysis.byYear[year] = { total: 0, withPolyline: 0, without: 0 };
      }
      analysis.byYear[year].total++;
      if (hasPolyline || hasSummaryPolyline) {
        analysis.byYear[year].withPolyline++;
      } else {
        analysis.byYear[year].without++;
      }
    }
    
    console.log('\n📊 POLYLINE ANALYSIS REPORT');
    console.log('-'.repeat(50));
    console.log(`Total activity accomplishments: ${analysis.total}`);
    console.log(`With polyline field: ${analysis.withPolyline}`);
    console.log(`With summary_polyline field: ${analysis.withSummaryPolyline}`);
    console.log(`With both fields: ${analysis.withBoth}`);
    console.log(`With neither field: ${analysis.withNone}`);
    console.log(`With start/end coordinates: ${analysis.withStartEnd}`);
    console.log(`\n🔧 Fixable (no polyline but has coordinates): ${analysis.fixable}`);
    
    console.log('\n📍 By Source:');
    for (const [source, count] of Object.entries(analysis.bySource).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${source}: ${count}`);
    }
    
    console.log('\n📅 By Year:');
    const sortedYears = Object.keys(analysis.byYear).map(Number).sort((a, b) => b - a);
    for (const year of sortedYears) {
      const data = analysis.byYear[year];
      const defcon = year - 1992;
      console.log(`  DC${defcon} (${year}): ${data.total} total, ${data.withPolyline} with polyline, ${data.without} without`);
    }
    
    if (analysis.fixable > 0) {
      console.log('\n💡 Run with --fix flag to repair missing polylines');
      console.log('   Example: npm run fix-polylines -- --fix');
    }
    
  } catch (error) {
    console.error('❌ Error in polyline analysis:', error);
    process.exit(1);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  
  if (shouldFix) {
    await fixMissingPolylines();
  } else {
    await analyzePolylines();
  }
}

// Run the script
main().catch(console.error);