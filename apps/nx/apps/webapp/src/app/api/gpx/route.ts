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
    let routeDetails: any = null;

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
      // Handle route selection - fetch route details from Strapi
      if (selectedRoute) {
        try {
          console.log(`Attempting to fetch route details for route ID: ${selectedRoute}`);
          routeDetails = await fetchRouteFromStrapi(selectedRoute);
          console.log(`Route details fetched:`, !!routeDetails);
          if (routeDetails) {
            console.log(`Route details object:`, JSON.stringify(routeDetails, null, 2));
            // Convert Strapi distance to kilometers based on unit
            let distanceInKm = 0;
            if (routeDetails.distance && routeDetails.distanceUnit) {
              const distance = parseFloat(routeDetails.distance);
              const unit = routeDetails.distanceUnit.toLowerCase();
              
              switch (unit) {
                case 'km':
                case 'kilometers':
                case 'kilometres':
                  distanceInKm = distance;
                  break;
                case 'miles':
                case 'mi':
                  distanceInKm = distance * 1.60934; // 1 mile = 1.60934 km
                  break;
                case 'steps':
                case 'meters':
                case 'metres':
                case 'm':
                  distanceInKm = distance / 1000; // 1000 meters = 1 km, 1 step = 1 meter
                  break;
                default:
                  console.warn(`Unknown distance unit: ${routeDetails.distanceUnit}, treating as kilometers`);
                  distanceInKm = distance;
              }
              
              console.log(`Strapi distance conversion: ${routeDetails.distance} ${routeDetails.distanceUnit} = ${distanceInKm.toFixed(3)} km`);
            }
            
            // Initialize with converted Strapi values
            stats = {
              distance: distanceInKm,
              movingTime: routeDetails.estimated_time || 0
            };
            
            // If route has GPX data, parse it for location info
            if (routeDetails.gpx?.url) {
              const gpxUrl = routeDetails.gpx.url.startsWith('http') 
                ? routeDetails.gpx.url 
                : `${process.env.STRAPI_URL || 'https://cms.defcon.run'}${routeDetails.gpx.url}`;
              
              console.log(`Fetching GPX from: ${gpxUrl}`);
              const gpxResponse = await fetch(gpxUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `bearer ${process.env.AUTH_STRAPI_TOKEN}`
                },
              });
              if (gpxResponse.ok) {
                const gpxContent = await gpxResponse.text();
                console.log(`GPX content length: ${gpxContent.length}`);
                const tracks = parseGPX(gpxContent);
                console.log(`Parsed ${tracks.length} tracks`);
                
                if (tracks.length > 0 && tracks[0].points.length > 0) {
                  const track = tracks[0];
                  console.log(`Track has ${track.points.length} points`);
                  startLocation = [track.points[0].lat, track.points[0].lon];
                  endLocation = [track.points[track.points.length - 1].lat, track.points[track.points.length - 1].lon];
                  polyline = generatePolyline(track.points);
                  
                  // Only calculate from GPX if Strapi didn't provide distance
                  if (stats.distance <= 0) {
                    const calculatedStats = calculateTrackStats(track.points);
                    if (calculatedStats.distance > 0) {
                      stats.distance = calculatedStats.distance;
                      stats.movingTime = calculatedStats.movingTime;
                      console.log(`Distance calculation: Using GPX calculated ${stats.distance}km (no Strapi distance available)`);
                    } else {
                      console.log(`Distance calculation: No valid distance from Strapi or GPX`);
                    }
                  } else {
                    console.log(`Distance calculation: Using Strapi value ${stats.distance}km`);
                  }
                  
                  // Always update moving time from GPX if not set
                  if (!stats.movingTime) {
                    const calculatedStats = calculateTrackStats(track.points);
                    stats.movingTime = calculatedStats.movingTime;
                    console.log(`Moving time: Using GPX calculated ${stats.movingTime}min`);
                  }
                  console.log(`Start: ${startLocation}, End: ${endLocation}`);
                  
                  // Verify route is in Las Vegas
                  const isInLasVegas = checkLocationBounds(track.points);
                  if (!isInLasVegas) {
                    return NextResponse.json({ 
                      message: 'Selected route is not in the Las Vegas area and cannot be used for DEFCON accomplishments' 
                    }, { status: 400 });
                  }
                } else {
                  console.log('No valid tracks or points found in GPX');
                }
              } else {
                console.error(`Failed to fetch GPX: ${gpxResponse.status} ${gpxResponse.statusText}`);
              }
            } else {
              console.log('No GPX URL found in route details');
            }
          }
        } catch (error) {
          console.error('Error fetching route details:', error);
          // Don't fail the entire upload if route fetching fails
          // Just log the error and continue with basic route info
          console.log('Continuing with basic route information due to fetch error');
        }
      } else {
        console.log('No selectedRoute provided, skipping route details fetch');
      }
      
      // If we still don't have route details but have a selected route, create minimal info
      if (!routeDetails && selectedRoute) {
        console.log('Creating minimal route details as fallback');
        routeDetails = {
          id: selectedRoute,
          name: `Route ${selectedRoute}`,
          distance: 0,
          distanceUnit: 'km'
        };
      }
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

    // Final validation and logging before creating accomplishment
    console.log('Final accomplishment data before creation:');
    console.log(`- Upload method: ${uploadMethod}`);
    console.log(`- Stats: ${stats.distance}km, ${stats.movingTime}min`);
    console.log(`- Start location: ${startLocation}`);
    console.log(`- End location: ${endLocation}`);
    console.log(`- Polyline length: ${polyline?.length || 0}`);
    console.log(`- Route details available: ${!!routeDetails}`);

    // Create accomplishment
    const accomplishmentName = `${activityType.charAt(0).toUpperCase() + activityType.slice(1)}: "${description}"`;
    const baseDescription = `DC33 ${dc33Day.replace('day', 'Day ')} - ${activityType}`;
    const accomplishmentDescription = stats.distance > 0
      ? `${baseDescription} - ${stats.distance.toFixed(2)}km${stats.movingTime > 0 ? ` in ${stats.movingTime} minutes` : ''}`
      : `${baseDescription} - ${uploadMethod === 'gpx' ? 'GPX file' : 'Route-based'} activity`;
    
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
        distance_km: parseFloat(stats.distance.toFixed(2)),
        moving_time_minutes: stats.movingTime,
        polyline: polyline || null,
        summary_polyline: typeof polyline === 'string' ? polyline : null, // Ensure string format
        distance: (stats.distance * 1000).toString(), // Distance in meters as string (Strava format)
        distanceUnit: 'meters', // Match Strava format
        moving_time: stats.movingTime * 60, // Moving time in seconds as number
        start_location: startLocation,
        end_location: endLocation,
        // Only include latlng fields if we have valid location data
        ...(startLocation && { start_latlng: startLocation }),
        ...(endLocation && { end_latlng: endLocation }),
        // Include full route details from Strapi when available
        ...(routeDetails && {
          route_details: routeDetails,
          route_name: routeDetails.name,
          route_description: routeDetails.description,
          route_distance: routeDetails.distance,
          route_difficulty: routeDetails.difficulty,
          route_type: routeDetails.type,
          route_gpx_url: routeDetails.gpx?.url,
          route_created_at: routeDetails.createdAt,
          route_updated_at: routeDetails.updatedAt
        })
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
  // For now, create a simple coordinate string that the heat map can parse
  // The heat map already handles both encoded polylines and coordinate arrays
  const decimated = points.filter((_, index) => index % Math.max(1, Math.floor(points.length / 100)) === 0);
  
  // Create a JSON string of coordinate pairs that can be parsed by the heat map
  const coordPairs = decimated.map(p => [p.lat, p.lon]);
  return JSON.stringify(coordPairs);
}

async function fetchRouteFromStrapi(routeId: string): Promise<any> {
  try {
    const strapiUrl = process.env.STRAPI_URL || 'https://cms.defcon.run';
    const url = `${strapiUrl}/api/routes/${routeId}?populate=*`;
    
    console.log(`Fetching route details from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `bearer ${process.env.AUTH_STRAPI_TOKEN}`
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch route ${routeId}: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`Successfully fetched route details for ID ${routeId}:`, data.data?.attributes);
    
    return data.data?.attributes || null;
  } catch (error) {
    console.error('Error fetching route from Strapi:', error);
    return null;
  }
}