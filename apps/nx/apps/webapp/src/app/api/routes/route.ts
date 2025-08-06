import { NextRequest, NextResponse } from 'next/server';
import { strapi } from '@components/cms/data';
import { auth } from '@auth';

// GPX parsing utility to extract polyline and start/end points
async function extractPolylineFromGPX(gpxUrl: string): Promise<{ polyline: string | null; startPoint?: { lat: number; lng: number }; endPoint?: { lat: number; lng: number } }> {
  try {
    console.log('Fetching GPX from:', gpxUrl);
    const response = await fetch(gpxUrl);
    if (!response.ok) return { polyline: null };
    
    const gpxText = await response.text();
    
    // Parse GPX to extract all types of points
    const allPoints: [number, number][] = [];
    
    // Extract track points (trkpt) - these are usually part of a recorded track
    const trkptRegex = /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"/g;
    let match;
    let trkptCount = 0;
    
    while ((match = trkptRegex.exec(gpxText)) !== null) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lon)) {
        allPoints.push([lat, lon]);
        trkptCount++;
      }
    }
    
    // Extract route points (rtept) - these define a planned route
    const rteptRegex = /<rtept[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"/g;
    let rteptCount = 0;
    
    while ((match = rteptRegex.exec(gpxText)) !== null) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lon)) {
        allPoints.push([lat, lon]);
        rteptCount++;
      }
    }
    
    // Extract waypoints (wpt) - these are individual points of interest
    const wptRegex = /<wpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"/g;
    let wptCount = 0;
    
    while ((match = wptRegex.exec(gpxText)) !== null) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lon)) {
        allPoints.push([lat, lon]);
        wptCount++;
      }
    }
    
    console.log(`GPX parsing results - Track points: ${trkptCount}, Route points: ${rteptCount}, Waypoints: ${wptCount}, Total: ${allPoints.length}`);
    
    if (allPoints.length < 2) {
      console.log('Not enough points to create polyline');
      return { polyline: null };
    }
    
    // Sort points by order in file (they should already be in order from regex parsing)
    // If we have track points, prioritize those as they represent the actual path
    let finalPoints = allPoints;
    if (trkptCount >= 2) {
      // Use only track points if we have enough
      finalPoints = allPoints.slice(0, trkptCount);
      console.log('Using track points for polyline');
    } else if (rteptCount >= 2) {
      // Use route points if no track points but we have route points
      finalPoints = allPoints.slice(trkptCount, trkptCount + rteptCount);
      console.log('Using route points for polyline');
    } else {
      // Use all points (including waypoints) to create a path
      console.log('Using all points for polyline');
    }
    
    // Extract start and end points
    const startPoint = finalPoints.length > 0 ? { lat: finalPoints[0][0], lng: finalPoints[0][1] } : undefined;
    const endPoint = finalPoints.length > 1 ? { lat: finalPoints[finalPoints.length - 1][0], lng: finalPoints[finalPoints.length - 1][1] } : undefined;
    
    // Convert to polyline format
    const polyline = encodePolyline(finalPoints);
    
    return {
      polyline,
      startPoint,
      endPoint
    };
    
  } catch (error) {
    console.error('Error processing GPX:', error);
    return { polyline: null };
  }
}

// Simple polyline encoding (Google's algorithm)
function encodePolyline(coordinates: [number, number][]): string {
  let result = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of coordinates) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);
    
    const dlat = latE5 - prevLat;
    const dlng = lngE5 - prevLng;
    
    result += encodeNumber(dlat) + encodeNumber(dlng);
    
    prevLat = latE5;
    prevLng = lngE5;
  }
  
  return result;
}

function encodeNumber(num: number): string {
  let encoded = '';
  num = num < 0 ? ~(num << 1) : num << 1;
  
  while (num >= 0x20) {
    encoded += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
    num >>= 5;
  }
  
  encoded += String.fromCharCode(num + 63);
  return encoded;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }
  try {
    const routes = await strapi("/routes?populate=*");
    
    console.log('Raw Strapi routes data:', JSON.stringify(routes.data?.[0], null, 2));
    
    // Transform routes data to include just the info we need
    const routeOptions = await Promise.all(routes.data.map(async (route: any) => {
      const attributes = route.attributes || route;
      let distanceDisplay = 'Unknown distance';
      
      // Convert distance based on unit from Strapi - display everything in KM
      if (attributes.distance && attributes.distanceUnit) {
        const distance = parseFloat(attributes.distance);
        const unit = attributes.distanceUnit.toLowerCase();
        let distanceInKm = 0;
        
        switch (unit) {
          case 'km':
          case 'kilometers':
          case 'kilometres':
            distanceInKm = distance;
            break;
          case 'miles':
          case 'mi':
            distanceInKm = distance * 1.60934; // Convert miles to km
            break;
          case 'steps':
          case 'meters':
          case 'metres':
          case 'm':
            distanceInKm = distance / 1000; // Convert meters to km
            break;
          default:
            console.warn(`Unknown distance unit: ${attributes.distanceUnit}, treating as kilometers`);
            distanceInKm = distance;
        }
        
        // Format distance display - show 1 decimal place for precision
        distanceDisplay = `${distanceInKm.toFixed(1)}km`;
      }
      
      const routeName = attributes.name || attributes.title || `Route ${route.id}`;
      const routeDescription = attributes.description ? ` - ${attributes.description}` : '';
      
      // Handle complex objects and extract coordinates
      const processLocation = (loc: any) => {
        if (!loc) return null;
        if (typeof loc === 'string') return { text: loc };
        if (loc.latitude && loc.longitude) {
          return {
            text: loc.name || `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`,
            lat: loc.latitude,
            lng: loc.longitude
          };
        }
        if (loc.name) return { text: loc.name };
        return null;
      };

      // Get polyline - first try existing, then extract from GPX
      let polyline = attributes.polyline || attributes.encodedPolyline || attributes.route_polyline;
      const gpxUrl = attributes.gpxurl || attributes.gpxUrl || attributes.gpx_url || attributes.gpxFile?.url;
      const stravaUrl = attributes.stravaurl || attributes.stravaUrl || attributes.strava_url || attributes.stravaLink;
      
      let gpxStartPoint, gpxEndPoint;
      
      // If no polyline but we have a GPX URL, extract it
      if (!polyline && gpxUrl) {
        console.log('No polyline found, extracting from GPX:', gpxUrl);
        const gpxResult = await extractPolylineFromGPX(gpxUrl);
        polyline = gpxResult.polyline;
        gpxStartPoint = gpxResult.startPoint;
        gpxEndPoint = gpxResult.endPoint;
      }
      
      // Process start/end locations - use GPX points if not defined
      let startLocation = processLocation(attributes.startLocation || attributes.start_location);
      let endLocation = processLocation(attributes.endLocation || attributes.end_location);
      
      // If no start/end locations defined but we have GPX points, use those
      if (!startLocation && gpxStartPoint) {
        startLocation = {
          text: `${gpxStartPoint.lat.toFixed(6)}, ${gpxStartPoint.lng.toFixed(6)}`,
          lat: gpxStartPoint.lat,
          lng: gpxStartPoint.lng
        };
      }
      
      if (!endLocation && gpxEndPoint) {
        endLocation = {
          text: `${gpxEndPoint.lat.toFixed(6)}, ${gpxEndPoint.lng.toFixed(6)}`,
          lat: gpxEndPoint.lat,
          lng: gpxEndPoint.lng
        };
      }

      return {
        id: route.id,
        name: routeName,
        distance: distanceDisplay,
        distanceRaw: attributes.distance,
        distanceUnit: attributes.distanceUnit,
        description: attributes.description,
        polyline: polyline,
        elevationGain: attributes.elevationGain || attributes.elevation_gain,
        difficulty: attributes.difficulty,
        terrain: attributes.terrain,
        startLocation: startLocation,
        endLocation: endLocation,
        stravaUrl: stravaUrl,
        gpxUrl: gpxUrl,
        createdAt: attributes.createdAt,
        updatedAt: attributes.updatedAt,
      };
    }));

    return NextResponse.json({
      routes: routeOptions
    });

  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json(
      { message: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}