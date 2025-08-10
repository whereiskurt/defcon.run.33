#!/usr/bin/env ts-node

import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Entity } from 'electrodb';
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
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

interface GPXTrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
}

interface GPXTrack {
  name?: string;
  points: GPXTrackPoint[];
}

// Nevada state bounds (same as used in the API)
const NEVADA_BOUNDS = {
  north: 42.0,
  south: 35.0,
  east: -114.0,
  west: -120.01
};

async function findUser(identifier: string) {
  if (identifier.includes('@')) {
    const users = await User.query.primary({ email: identifier }).go();
    return users.data.length > 0 ? users.data[0] : null;
  } else {
    // Search by displayname - paginate through all users
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

async function updateUserAccomplishmentCounts(userEmail: string, type: 'activity' | 'social' | 'meshctf', year: number) {
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
  
  await updateUserAccomplishmentCounts(userEmail, accomplishment.type, accomplishment.year);
  
  return result.data;
}

function parseGPX(gpxContent: string): GPXTrack[] {
  const tracks: GPXTrack[] = [];

  try {
    // Parse tracks
    const trackMatches = gpxContent.match(/<trk[^>]*>[\s\S]*?<\/trk>/g) || [];

    for (const trackMatch of trackMatches) {
      const nameMatch = trackMatch.match(/<name[^>]*>(.*?)<\/name>/);
      const trackName = nameMatch ? nameMatch[1] : undefined;

      const trkptMatches =
        trackMatch.match(
          /<trkpt[^>]*lat="([^"]*)"[^>]*lon="([^"]*)"[^>]*>[\s\S]*?<\/trkpt>/g
        ) || [];

      const points: GPXTrackPoint[] = [];

      for (const trkptMatch of trkptMatches) {
        const latMatch = trkptMatch.match(/lat="([^"]*)"/);
        const lonMatch = trkptMatch.match(/lon="([^"]*)"/);
        const eleMatch = trkptMatch.match(/<ele[^>]*>(.*?)<\/ele>/);
        const timeMatch = trkptMatch.match(/<time[^>]*>(.*?)<\/time>/);

        if (latMatch && lonMatch) {
          const lat = parseFloat(latMatch[1]);
          const lon = parseFloat(lonMatch[1]);

          if (!isNaN(lat) && !isNaN(lon)) {
            points.push({ 
              lat, 
              lon,
              ...(eleMatch && { ele: parseFloat(eleMatch[1]) }),
              ...(timeMatch && { time: timeMatch[1] })
            });
          }
        }
      }

      if (points.length > 0) {
        tracks.push({
          name: trackName,
          points,
        });
      }
    }

    // If no tracks found, try parsing routes
    if (tracks.length === 0) {
      const routeMatches = gpxContent.match(/<rte[^>]*>[\s\S]*?<\/rte>/g) || [];

      for (const routeMatch of routeMatches) {
        const nameMatch = routeMatch.match(/<name[^>]*>(.*?)<\/name>/);
        const routeName = nameMatch ? nameMatch[1] : 'Route';

        const rteptMatches =
          routeMatch.match(
            /<rtept[^>]*lat="([^"]*)"[^>]*lon="([^"]*)"[^>]*>[\s\S]*?<\/rtept>/g
          ) || [];

        const points: GPXTrackPoint[] = [];

        for (const rteptMatch of rteptMatches) {
          const latMatch = rteptMatch.match(/lat="([^"]*)"/);
          const lonMatch = rteptMatch.match(/lon="([^"]*)"/);

          if (latMatch && lonMatch) {
            const lat = parseFloat(latMatch[1]);
            const lon = parseFloat(lonMatch[1]);

            if (!isNaN(lat) && !isNaN(lon)) {
              points.push({ lat, lon });
            }
          }
        }

        if (points.length > 0) {
          tracks.push({
            name: routeName,
            points,
          });
        }
      }
    }

    // If still no tracks, try waypoints
    if (tracks.length === 0) {
      const wptMatches = gpxContent.match(/<wpt[^>]*lat="([^"]*)"[^>]*lon="([^"]*)"[^>]*>[\s\S]*?<\/wpt>/g) || [];
      const points: GPXTrackPoint[] = [];

      for (const wptMatch of wptMatches) {
        const latMatch = wptMatch.match(/lat="([^"]*)"/);
        const lonMatch = wptMatch.match(/lon="([^"]*)"/);

        if (latMatch && lonMatch) {
          const lat = parseFloat(latMatch[1]);
          const lon = parseFloat(lonMatch[1]);

          if (!isNaN(lat) && !isNaN(lon)) {
            points.push({ lat, lon });
          }
        }
      }

      if (points.length > 0) {
        tracks.push({
          name: 'Waypoint Route',
          points,
        });
      }
    }
  } catch (error) {
    console.error('Error parsing GPX:', error);
  }

  return tracks;
}

function checkLocationBounds(points: GPXTrackPoint[]): boolean {
  const pointsToCheck = points.slice(0, Math.min(10, points.length));

  for (const point of pointsToCheck) {
    if (
      point.lat >= NEVADA_BOUNDS.south &&
      point.lat <= NEVADA_BOUNDS.north &&
      point.lon >= NEVADA_BOUNDS.west &&
      point.lon <= NEVADA_BOUNDS.east
    ) {
      return true;
    }
  }

  return false;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateTrackStats(points: GPXTrackPoint[]) {
  let totalDistance = 0;
  let totalTime = 0;

  // Calculate distance
  for (let i = 1; i < points.length; i++) {
    const distance = haversineDistance(
      points[i - 1].lat,
      points[i - 1].lon,
      points[i].lat,
      points[i].lon
    );
    totalDistance += distance;
  }

  // Calculate time if timestamps are available
  if (points[0]?.time && points[points.length - 1]?.time) {
    const startTime = new Date(points[0].time!).getTime();
    const endTime = new Date(points[points.length - 1].time!).getTime();
    totalTime = Math.round((endTime - startTime) / 60000); // Convert to minutes
  } else {
    // Estimate: 1 point per second
    totalTime = Math.round(points.length / 60);
  }

  return {
    distance: totalDistance, // in kilometers
    movingTime: Math.max(1, totalTime), // at least 1 minute
  };
}

function generatePolyline(points: GPXTrackPoint[]): string {
  // Decimate points if too many (keep max 100 points)
  const decimated = points.filter(
    (_, index) => index % Math.max(1, Math.floor(points.length / 100)) === 0
  );

  // Create a JSON string of coordinate pairs
  const coordPairs = decimated.map((p) => [p.lat, p.lon]);
  return JSON.stringify(coordPairs);
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

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('❌ Error: Not enough arguments provided');
    console.error('Usage: npm run manual-gpx <email|displayname> <gpx-file-path> [year] [description]');
    console.error('Examples:');
    console.error('  npm run manual-gpx test@example.com ./my-run.gpx');
    console.error('  npm run manual-gpx test@example.com ./my-run.gpx 2024');
    console.error('  npm run manual-gpx rabbit_1234 ./my-run.gpx 2024 "Morning 5K run"');
    process.exit(1);
  }

  const [identifier, gpxPath, yearArg, ...descriptionParts] = args;
  const description = descriptionParts.join(' ') || null;
  
  // Validate GPX file exists
  if (!fs.existsSync(gpxPath)) {
    console.error(`❌ Error: GPX file not found: ${gpxPath}`);
    process.exit(1);
  }

  // Check file size (200KB limit for admin uploads)
  const fileStats = fs.statSync(gpxPath);
  if (fileStats.size > 400 * 1024) {
    console.error('❌ Error: File size exceeds 200KB limit');
    process.exit(1);
  }

  // Check file extension
  if (!gpxPath.toLowerCase().endsWith('.gpx')) {
    console.error('❌ Error: File must be a GPX file');
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

    // Read and parse GPX file
    console.log(`\n📂 Reading GPX file: ${gpxPath}`);
    const gpxContent = fs.readFileSync(gpxPath, 'utf-8');
    const tracks = parseGPX(gpxContent);

    if (tracks.length === 0) {
      console.log('❌ No valid tracks, routes, or waypoints found in GPX file');
      process.exit(1);
    }

    const track = tracks[0];
    console.log(`✅ Found track with ${track.points.length} points`);

    // Check if activity is in Nevada
    const isInNevada = checkLocationBounds(track.points);
    if (!isInNevada) {
      console.log('⚠️  Warning: Activity does not appear to be in Nevada');
      const proceed = await askQuestion('Continue anyway? (yes/NO): ');
      if (proceed.toLowerCase() !== 'yes') {
        console.log('❌ Upload cancelled.');
        process.exit(0);
      }
    }

    // Calculate statistics
    const stats = calculateTrackStats(track.points);
    console.log(`\n📊 Activity Statistics:`);
    console.log(`  Distance: ${stats.distance.toFixed(2)} km`);
    console.log(`  Estimated Time: ${stats.movingTime} minutes`);

    // Determine year (use current year or provided year)
    let year = new Date().getFullYear();
    if (yearArg) {
      const parsedYear = parseInt(yearArg);
      if (!isNaN(parsedYear) && parsedYear >= 2020 && parsedYear <= 2030) {
        year = parsedYear;
      } else {
        console.log(`⚠️  Invalid year provided: ${yearArg}, using current year: ${year}`);
      }
    }
    const defconNumber = year - 1992;

    // Get activity type
    console.log('\n📝 Select activity type:');
    console.log('1. Run');
    console.log('2. Walk');
    console.log('3. Ruck');
    console.log('4. Bike');
    console.log('5. Roll');
    console.log('6. Swim');
    
    const typeChoice = await askQuestion('Enter choice (1-6): ');
    const activityTypes = ['run', 'walk', 'ruck', 'bike', 'roll', 'swim'];
    const activityType = activityTypes[parseInt(typeChoice) - 1] || 'run';

    // Get or generate description
    const finalDescription = description || 
                           track.name || 
                           await askQuestion('Enter activity description (or press Enter for default): ') || 
                           'Manual GPX Upload';

    // Generate polyline
    const polyline = generatePolyline(track.points);
    const startLocation = track.points[0] ? [track.points[0].lat, track.points[0].lon] : null;
    const endLocation = track.points[track.points.length - 1] 
      ? [track.points[track.points.length - 1].lat, track.points[track.points.length - 1].lon] 
      : null;

    // Create accomplishment
    const accomplishmentName = `${activityType.charAt(0).toUpperCase() + activityType.slice(1)}: "${finalDescription}"`;
    const accomplishmentDescription = `DC${defconNumber} - ${stats.distance.toFixed(2)}km ${activityType} in ${stats.movingTime} minutes`;

    console.log(`\n🎯 About to create accomplishment:`);
    console.log(`  Name: ${accomplishmentName}`);
    console.log(`  Description: ${accomplishmentDescription}`);
    console.log(`  Year: ${year} (DC${defconNumber})`);
    console.log(`  Type: activity`);
    
    const confirm = await askQuestion('\nProceed with creating this accomplishment? (yes/NO): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Upload cancelled.');
      process.exit(0);
    }

    const accomplishment = await createAccomplishment(
      user.id,
      user.email,
      {
        type: 'activity',
        name: accomplishmentName,
        description: accomplishmentDescription,
        completedAt: Date.now(),
        year: year,
        metadata: {
          points: 1, // Award 1 point for manual uploads
          source: 'manual_gpx_admin',
          activity_type: activityType,
          sport_type: activityType,
          upload_method: 'manual_admin',
          distance: (stats.distance * 1000).toString(), // Distance in meters as string
          distance_km: stats.distance,
          moving_time: stats.movingTime * 60, // Seconds
          moving_time_minutes: stats.movingTime,
          summary_polyline: polyline,
          polyline: polyline,
          start_latlng: startLocation,
          end_latlng: endLocation,
          start_location: startLocation,
          end_location: endLocation,
          location: 'Nevada, USA',
          uploaded_by: 'admin_script',
          gpx_filename: path.basename(gpxPath)
        }
      }
    );

    console.log('\n✅ Accomplishment created successfully!');
    console.log(`Accomplishment ID: ${accomplishment.accomplishmentId}`);
    console.log(`Points awarded: 1`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);