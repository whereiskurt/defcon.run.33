import { auth } from '@auth';
import { getAllAccomplishmentsForType } from '@db/accomplishment';
import { NextRequest, NextResponse } from 'next/server';
import polyline from '@mapbox/polyline';

// In-memory cache for heat map data
interface HeatMapCache {
  data: any;
  generatedAt: number;
  isGenerating: boolean;
}

let heatMapCache: HeatMapCache = {
  data: null,
  generatedAt: 0,
  isGenerating: false
};

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds (reduced from 5)

// Function to clear cache (internal use only)
function clearHeatmapCache() {
  heatMapCache.generatedAt = 0;
}

// Function to decode polyline and extract points
function decodePolyline(encodedPolyline: string) {
  try {
    return polyline.decode(encodedPolyline);
  } catch (error) {
    console.error('Error decoding polyline:', error);
    return [];
  }
}

// Function to convert polyline coordinates to GPX format
function generateGPX(polyline: [number, number][], name: string): string {
  const trackPoints = polyline.map(([lat, lng]) => 
    `    <trkpt lat="${lat}" lon="${lng}"></trkpt>`
  ).join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="DEFCON.run Activity Heat Map">
  <trk>
    <name>${name}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;
}

// Function to parse GPX and extract coordinates
function parseGPXToPoints(gpxContent: string): [number, number][] {
  try {
    const points: [number, number][] = [];
    // Extract trackpoints using regex
    const trackpointRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g;
    let match;
    while ((match = trackpointRegex.exec(gpxContent)) !== null) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lon)) {
        points.push([lat, lon]);
      }
    }
    return points;
  } catch (error) {
    console.error('Error parsing GPX:', error);
    return [];
  }
}

// Function to fetch GPX from Strapi URL
async function fetchGPXFromStrapi(url: string): Promise<string | null> {
  try {
    // Ensure URL is absolute
    const gpxUrl = url.startsWith('http') ? url : `${process.env.STRAPI_URL || 'https://cms.defcon.run'}${url}`;
    const response = await fetch(gpxUrl, {
      method: 'GET',
      headers: {
        'Authorization': `bearer ${process.env.AUTH_STRAPI_TOKEN}`
      },
    });
    if (!response.ok) {
      console.error(`Failed to fetch GPX from ${gpxUrl}: ${response.status}`);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.error('Error fetching GPX from Strapi:', error);
    return null;
  }
}

// Function to generate heat map data from accomplishments
async function generateHeatMapData() {
  try {
    
    // Fetch all activity accomplishments (which contain Strava data with polylines)
    const accomplishments = await getAllAccomplishmentsForType('activity');
    
    // Track unique users
    const uniqueUsers = new Set(accomplishments.map(a => a.userId));
    
    // Group accomplishments by year to create separate layers
    const accomplishmentsByYear = new Map<number, any[]>();
    
    // Process all accomplishments in parallel to avoid async issues
    const processedAccomplishments = await Promise.all(
      accomplishments.map(async (accomplishment) => {
        const metadata = accomplishment.metadata;
        let decodedPoints: [number, number][] = [];
        
        // First, try to get points from Strava polyline
        if (metadata?.summary_polyline) {
          // Try to parse as JSON coordinate array first (for manual uploads)
          try {
            const coordArray = JSON.parse(metadata.summary_polyline);
            if (Array.isArray(coordArray) && coordArray.length > 0 && Array.isArray(coordArray[0])) {
              decodedPoints = coordArray as [number, number][];
            }
          } catch {
            // If JSON parsing fails, try polyline decoding (for Strava data)
            decodedPoints = decodePolyline(metadata.summary_polyline);
          }
        }
        
        // If no Strava polyline, check for pre-selected route GPX URL
        if (decodedPoints.length === 0 && metadata?.gpxUrl) {
          const gpxContent = await fetchGPXFromStrapi(metadata.gpxUrl);
          if (gpxContent) {
            decodedPoints = parseGPXToPoints(gpxContent);
          }
        }
        
        // Check various possible GPX URL fields in metadata
        if (decodedPoints.length === 0) {
          const possibleGpxFields = [
            (metadata as any)?.gpx_url,
            (metadata as any)?.gpxURL,
            (metadata as any)?.gpx,
            (metadata as any)?.route_gpx_url,
            (metadata as any)?.selectedRoute?.gpx_url,
            (metadata as any)?.selectedRoute?.gpxUrl,
            (metadata as any)?.route?.gpx_url,
            (metadata as any)?.route?.gpxUrl,
          ];
          
          for (const gpxField of possibleGpxFields) {
            if (gpxField && typeof gpxField === 'string') {
              const gpxContent = await fetchGPXFromStrapi(gpxField);
              if (gpxContent) {
                decodedPoints = parseGPXToPoints(gpxContent);
                if (decodedPoints.length > 0) {
                  break;
                }
              }
            }
          }
        }
        
        // Log debug info for activities without points
        if (decodedPoints.length === 0 && metadata) {
        }
        
        return {
          accomplishment,
          metadata,
          decodedPoints
        };
      })
    );
    
    // Track accomplishments without polylines
    let noPolylineCount = 0;
    const usersWithoutPolylines = new Set<string>();
    
    // Now process the results synchronously
    for (const { accomplishment, metadata, decodedPoints } of processedAccomplishments) {
      if (decodedPoints.length > 0) {
        const year = accomplishment.year;
        if (!accomplishmentsByYear.has(year)) {
          accomplishmentsByYear.set(year, []);
        }
        
        accomplishmentsByYear.get(year)!.push({
          accomplishment,
          metadata,
          decodedPoints
        });
      } else {
        noPolylineCount++;
        usersWithoutPolylines.add(accomplishment.userId);
      }
    }
    
    
    const routes: any[] = [];
    
    // Create separate routes for each DC year as individual layers
    if (accomplishmentsByYear.size > 0) {
      // Sort years in descending order (newest first)
      const sortedYears = Array.from(accomplishmentsByYear.keys()).sort((a, b) => b - a);
      
      for (const year of sortedYears) {
        const yearAccomplishments = accomplishmentsByYear.get(year)!;
        const defconNumber = year - 1992; // DEFCON 1 was in 1993, so 2024 = DC32
        
        // Create individual routes for each activity in this year
        for (let i = 0; i < yearAccomplishments.length; i++) {
          const { metadata, decodedPoints } = yearAccomplishments[i];
          const activityType = metadata.sport_type || metadata.activity_type || 'Activity';
          const activityName = `${activityType} #${i + 1}`;
          
          const route = {
            id: `activity_${year}_${i}`,
            name: activityName,
            color: '#ff0000', // Red color for heat map
            opacity: 0.7, // More opaque for highlighter effect
            weight: 4, // Thinner lines for better visibility with many routes
            lineCap: 'round', // Rounded line caps
            lineJoin: 'round', // Rounded line joins
            gpx: generateGPX(decodedPoints, activityName),
            hideMarkers: true, // Custom flag to indicate no pins should be shown
            hideArrows: true, // Custom flag to indicate no direction arrows
            // Each activity gets its own layer based on DC year
            layers: [{
              title: `DC${defconNumber}`,
              sortKey: String(100 - defconNumber).padStart(3, '0'), // Sort newest first (DC33, DC32, DC31...)
              visible: true, // Show all layers by default
            }],
            attributes: {
              title: activityName,
              description: `${activityType} activity from DC${defconNumber}`,
              route_details: {
                activityType: activityType,
                distance: metadata.distance,
                movingTime: metadata.moving_time,
                year: year,
                defconNumber: defconNumber
              }
            }
          };
          
          routes.push(route);
        }
      }
    }
    
    // Calculate stats for overlay - only count data that contributes to heat map
    const totalRunners = new Set();
    let totalDistanceMeters = 0;
    let totalActivities = 0;
    
    // Only count accomplishments that have polylines and contribute to the visualization
    accomplishmentsByYear.forEach((yearAccomplishments) => {
      for (const { accomplishment, metadata } of yearAccomplishments) {
        // This data is already filtered to only include accomplishments with polylines
        // since we only add them to accomplishmentsByYear if they have summary_polyline
        totalRunners.add(accomplishment.userId);
        totalActivities++;
        if (metadata.distance) {
          totalDistanceMeters += parseFloat(metadata.distance);
        }
      }
    });
    
    const stats = {
      totalRunners: totalRunners.size,
      totalActivities: totalActivities,
      totalDistanceKm: Math.round(totalDistanceMeters / 1000),
      totalDistanceMeters: Math.round(totalDistanceMeters),
      years: accomplishmentsByYear.size,
      // Additional diagnostic stats
      totalAccomplishments: accomplishments.length,
      accomplishmentsWithPolylines: processedAccomplishments.filter(p => p.decodedPoints.length > 0).length,
      accomplishmentsWithoutPolylines: noPolylineCount,
      usersWithActivities: uniqueUsers.size,
      usersWithPolylines: totalRunners.size,
      usersWithoutPolylines: usersWithoutPolylines.size
    };
    
    
    return { routes, stats };
  } catch (error) {
    console.error('Error generating heat map data:', error);
    throw error;
  }
}

// Function to aggregate heat points into a grid for better performance
function aggregateHeatPoints(points: any[]) {
  const gridSize = 0.001; // ~100m grid cells
  const heatGrid = new Map<string, number>();
  
  points.forEach(point => {
    const gridLat = Math.floor(point.lat / gridSize) * gridSize;
    const gridLng = Math.floor(point.lng / gridSize) * gridSize;
    const key = `${gridLat},${gridLng}`;
    
    heatGrid.set(key, (heatGrid.get(key) || 0) + point.intensity);
  });
  
  // Convert back to array format with intensity levels
  const aggregated = Array.from(heatGrid.entries()).map(([key, intensity]) => {
    const [lat, lng] = key.split(',').map(Number);
    return {
      lat: lat + gridSize / 2, // Center of grid cell
      lng: lng + gridSize / 2,
      intensity: Math.min(intensity, 100) // Cap intensity at 100
    };
  });
  
  return aggregated;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }

  try {
    const now = Date.now();
    const cacheAge = now - heatMapCache.generatedAt;
    
    // Check if cache is still valid
    if (heatMapCache.data && cacheAge < CACHE_DURATION) {
      // Return cached data
      return NextResponse.json(heatMapCache.data, { status: 200 });
    }
    
    // If another request is already generating, return stale data if available
    if (heatMapCache.isGenerating && heatMapCache.data) {
      return NextResponse.json(heatMapCache.data, { status: 200 });
    }
    
    // Mark as generating to prevent duplicate generation
    heatMapCache.isGenerating = true;
    
    // Generate new heat map data
    const newData = await generateHeatMapData();
    
    // Update cache
    heatMapCache = {
      data: newData,
      generatedAt: now,
      isGenerating: false
    };
    
    return NextResponse.json(newData, { status: 200 });
    
  } catch (error) {
    console.error('Error in heat map API:', error);
    heatMapCache.isGenerating = false;
    
    // If we have stale data, return it with a warning
    if (heatMapCache.data) {
      return NextResponse.json(heatMapCache.data, { status: 200 });
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Endpoint to force refresh the cache
export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }

  try {
    // Force regeneration
    heatMapCache.generatedAt = 0;
    
    // Trigger generation
    const response = await GET(req);
    return response;
    
  } catch (error) {
    console.error('Error forcing heat map refresh:', error);
    return NextResponse.json(
      { message: 'Failed to refresh heat map' },
      { status: 500 }
    );
  }
}