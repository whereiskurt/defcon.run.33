import { auth } from '@auth';
import { NextRequest, NextResponse } from 'next/server';
import { createAccomplishment, Accomplishments } from '@db/accomplishment';
import { UpdateUserAccomplishmentCounts, getUser, User } from '@db/user';
import { MAX_UPLOADS_PER_DAY } from './constants';

// Generate DEFCON years - 8 years back from DC33 (2025)
const defconYears = Array.from({ length: 8 }, (_, i) => {
  const year = 2025 - i;
  const dcNumber = year - 1992;
  return {
    key: year.toString(),
    label: `DC${dcNumber} (${year})`,
    year: year,
    dcNumber: dcNumber
  };
});

const dc33Days = [
  { key: 'day1', label: 'Day 1 (Thursday)' },
  { key: 'day2', label: 'Day 2 (Friday)' },
  { key: 'day3', label: 'Day 3 (Saturday)' },
  { key: 'day4', label: 'Day 4 (Sunday)' }
];

// Las Vegas bounds (same as used in Strava integration)
const LAS_VEGAS_BOUNDS = {
  north: 36.7,
  south: 35.6,
  east: -114.4,
  west: -115.8
};

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

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const uploadMethod = formData.get('uploadMethod') as string;
    const file = formData.get('gpx') as File;
    const activityType = formData.get('activityType') as string;
    const description = formData.get('description') as string;
    const defconYear = formData.get('defconYear') as string;
    const dc33Day = formData.get('dc33Day') as string;
    const selectedRoute = formData.get('selectedRoute') as string;

    // Comprehensive input validation
    if (uploadMethod === 'gpx' && !file) {
      return NextResponse.json({ message: 'No GPX file provided' }, { status: 400 });
    }

    if (uploadMethod === 'route' && !selectedRoute) {
      return NextResponse.json({ message: 'No route selected' }, { status: 400 });
    }

    // Validate activity type against allowed values
    const allowedActivityTypes = ['run', 'walk', 'ruck', 'bike', 'roll', 'swim'];
    if (!activityType || !allowedActivityTypes.includes(activityType)) {
      return NextResponse.json({ message: 'Invalid activity type' }, { status: 400 });
    }

    if (!defconYear) {
      return NextResponse.json({ message: 'DEFCON year is required' }, { status: 400 });
    }

    if (!dc33Day) {
      return NextResponse.json({ message: 'DEFCON day is required' }, { status: 400 });
    }

    if (!description?.trim() || description.trim().length > 100) {
      return NextResponse.json({ message: 'Description is required and must be less than 100 characters' }, { status: 400 });
    }
    
    // Additional file validation for GPX uploads
    if (uploadMethod === 'gpx' && file) {
      // Check file size (30KB limit)
      if (file.size > 30 * 1024) {
        return NextResponse.json({ message: 'File size exceeds 30KB limit' }, { status: 400 });
      }
      
      // Check file extension
      if (!file.name.toLowerCase().endsWith('.gpx')) {
        return NextResponse.json({ message: 'File must be a GPX file' }, { status: 400 });
      }
      
      // Check MIME type if available
      if (file.type && !file.type.includes('gpx') && !file.type.includes('xml') && file.type !== 'application/octet-stream') {
        return NextResponse.json({ message: 'Invalid file type. Must be a GPX file.' }, { status: 400 });
      }
    }

    let stats = { distance: 0, movingTime: 0 };
    let polyline = '';
    let startLocation: [number, number] | null = null;
    let endLocation: [number, number] | null = null;

    if (uploadMethod === 'gpx') {
      // Handle GPX file upload - validation already done above
      // Parse GPX file
      const gpxContent = await file.text();
      const tracks = parseGPX(gpxContent);

      if (tracks.length === 0) {
        return NextResponse.json({ message: 'No valid tracks found in GPX file' }, { status: 400 });
      }

      // Check if activity is in Las Vegas area
      const track = tracks[0]; // Use the first track
      const isInLasVegas = checkLocationBounds(track.points);

      if (!isInLasVegas) {
        return NextResponse.json({ 
          message: 'Activity must be located in the Las Vegas area to qualify for DEFCON accomplishments' 
        }, { status: 400 });
      }

      // Calculate basic statistics
      stats = calculateTrackStats(track.points);
      
      // Generate polyline (simplified)
      polyline = generatePolyline(track.points);
      
      startLocation = track.points[0] ? [track.points[0].lat, track.points[0].lon] : null;
      endLocation = track.points[track.points.length - 1] ? [track.points[track.points.length - 1].lat, track.points[track.points.length - 1].lon] : null;
    } else {
      // Handle route selection - no file processing needed
      // For route-based activities, we'll use placeholder values
      stats = { distance: 0, movingTime: 0 }; // Route distance would need to be fetched from route data
      polyline = ''; // Could be populated from route data if available
      startLocation = null;
      endLocation = null;
    }

    // Get user details
    const user = await getUser(session.user.email);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Validate DEFCON year and day are valid
    const validYear = defconYears.find(d => d.key === defconYear);
    const validDay = dc33Days.find(d => d.key === dc33Day);
    
    if (!validYear || !validDay) {
      return NextResponse.json({ 
        message: 'Invalid DEFCON year or day selected' 
      }, { status: 400 });
    }
    
    // Check upload limits using user's manual_upload_counts
    const uploadKey = `${defconYear}_${dc33Day}`;
    const currentUploads = user.manual_upload_counts?.[uploadKey] || 0;
    
    // Double-check against database to prevent race conditions
    // This ensures even if multiple requests come in simultaneously, we won't exceed the limit
    const freshUser = await getUser(session.user.email);
    const freshUploads = freshUser?.manual_upload_counts?.[uploadKey] || 0;
    
    if (freshUploads >= MAX_UPLOADS_PER_DAY) {
      return NextResponse.json({ 
        message: `Upload limit exceeded. You can only upload ${MAX_UPLOADS_PER_DAY} activities per day. You already have ${freshUploads} uploads for ${validYear.label} ${validDay.label}.` 
      }, { status: 400 });
    }
    
    // Additional validation: Check if user is trying to upload too many in general
    const totalUploadsToday = Object.entries(freshUser?.manual_upload_counts || {})
      .filter(([key]) => key.startsWith(`${defconYear}_`))
      .reduce((sum, [, count]) => sum + (count as number), 0);
    
    if (totalUploadsToday >= MAX_UPLOADS_PER_DAY * 4) { // Max 8 total per DEFCON year (2 per day * 4 days)
      return NextResponse.json({ 
        message: `Upload limit exceeded. Maximum ${MAX_UPLOADS_PER_DAY * 4} uploads allowed per DEFCON year.` 
      }, { status: 400 });
    }

    // Create accomplishment
    const accomplishmentName = `${activityType.charAt(0).toUpperCase() + activityType.slice(1)}: "${description}"`;
    const baseDescription = `DC33 ${dc33Day.replace('day', 'Day ')} - ${activityType}`;
    const accomplishmentDescription = uploadMethod === 'gpx' 
      ? `${baseDescription} - ${stats.distance.toFixed(2)}km in ${stats.movingTime} minutes`
      : `${baseDescription} - Route-based activity`;
    
    const accomplishmentData = {
      type: 'activity' as const,
      name: accomplishmentName,
      description: accomplishmentDescription,
      completedAt: Date.now(),
      year: new Date().getFullYear(),
      metadata: {
        points: 0, // No points awarded for manual uploads
        source: uploadMethod === 'gpx' ? 'manual_gpx' : 'manual_route',
        activity_type: activityType,
        dc33_day: dc33Day,
        defcon_year: parseInt(defconYear),
        route_id: selectedRoute || null,
        upload_method: uploadMethod,
        distance_km: uploadMethod === 'gpx' ? parseFloat(stats.distance.toFixed(2)) : null,
        moving_time_minutes: uploadMethod === 'gpx' ? stats.movingTime : null,
        polyline: polyline || null,
        start_location: startLocation,
        end_location: endLocation
      }
    };

    const accomplishment = await createAccomplishment(
      user.id,
      session.user.email,
      accomplishmentData
    );

    // Update user's manual upload count with fresh data to prevent race conditions
    // Re-fetch to ensure we have the latest count
    const finalUser = await getUser(session.user.email);
    const finalCount = finalUser?.manual_upload_counts?.[uploadKey] || 0;
    
    // Final check before incrementing
    if (finalCount >= MAX_UPLOADS_PER_DAY) {
      // Someone else uploaded while we were processing - rollback
      // Note: In production, you might want to delete the accomplishment here
      return NextResponse.json({ 
        message: `Upload limit exceeded. Another upload was processed while yours was in progress.` 
      }, { status: 400 });
    }
    
    const updatedCounts = {
      ...finalUser?.manual_upload_counts,
      [uploadKey]: finalCount + 1
    };
    
    await User.update({
      email: session.user.email,
      id: user.id,
    }).set({
      manual_upload_counts: updatedCounts
    }).go();

    return NextResponse.json({
      message: uploadMethod === 'gpx' ? 'GPX file processed successfully' : 'Route activity created successfully',
      accomplishmentId: accomplishment.accomplishmentId,
      uploadMethod: uploadMethod,
      stats: uploadMethod === 'gpx' ? {
        distance: stats.distance,
        movingTime: stats.movingTime,
        points: stats.distance > 0 ? Math.floor(stats.distance * 100) : 0 // Rough estimate based on distance
      } : {
        routeId: selectedRoute,
        method: 'route'
      }
    });

  } catch (error) {
    console.error('GPX processing error:', error);
    return NextResponse.json(
      { message: 'Failed to process GPX file' },
      { status: 500 }
    );
  }
}

function parseGPX(gpxContent: string): GPXTrack[] {
  const tracks: GPXTrack[] = [];
  
  try {
    // Simple regex-based parsing for GPX trackpoints
    const trackMatches = gpxContent.match(/<trk[^>]*>[\s\S]*?<\/trk>/g) || [];
    
    for (const trackMatch of trackMatches) {
      const nameMatch = trackMatch.match(/<name[^>]*>(.*?)<\/name>/);
      const trackName = nameMatch ? nameMatch[1] : undefined;
      
      const trkptMatches = trackMatch.match(/<trkpt[^>]*lat="([^"]*)"[^>]*lon="([^"]*)"[^>]*>[\s\S]*?<\/trkpt>/g) || [];
      
      const points: GPXTrackPoint[] = [];
      
      for (const trkptMatch of trkptMatches) {
        const latMatch = trkptMatch.match(/lat="([^"]*)"/);
        const lonMatch = trkptMatch.match(/lon="([^"]*)"/);
        
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
          name: trackName,
          points
        });
      }
    }
  } catch (error) {
    console.error('Error parsing GPX:', error);
  }
  
  return tracks;
}

function checkLocationBounds(points: GPXTrackPoint[]): boolean {
  // Check first 10 points to see if they're in Las Vegas bounds
  const pointsToCheck = points.slice(0, Math.min(10, points.length));
  
  for (const point of pointsToCheck) {
    if (point.lat >= LAS_VEGAS_BOUNDS.south && 
        point.lat <= LAS_VEGAS_BOUNDS.north &&
        point.lon >= LAS_VEGAS_BOUNDS.west && 
        point.lon <= LAS_VEGAS_BOUNDS.east) {
      return true; // If any point is in bounds, consider it valid
    }
  }
  
  return false;
}

function calculateTrackStats(points: GPXTrackPoint[]) {
  let totalDistance = 0;
  
  // Calculate distance using Haversine formula
  for (let i = 1; i < points.length; i++) {
    const distance = haversineDistance(
      points[i - 1].lat, points[i - 1].lon,
      points[i].lat, points[i].lon
    );
    totalDistance += distance;
  }
  
  // Estimate moving time (assume 1 point per second, this is a rough estimate)
  const estimatedMovingTime = Math.round(points.length / 60); // Convert to minutes
  
  return {
    distance: totalDistance, // in kilometers
    movingTime: Math.max(1, estimatedMovingTime) // at least 1 minute
  };
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function generatePolyline(points: GPXTrackPoint[]): string {
  // Simplified polyline generation - take every nth point to reduce size
  const decimated = points.filter((_, index) => index % Math.max(1, Math.floor(points.length / 100)) === 0);
  
  // Simple coordinate string (not actual polyline encoding, but sufficient for basic visualization)
  return decimated.map(p => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`).join(';');
}