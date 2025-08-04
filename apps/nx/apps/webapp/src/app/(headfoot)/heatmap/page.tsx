'use server';

import { auth } from '@auth';
import { getAllAccomplishmentsForType } from '@db/accomplishment';
import EnhancedClientMap from '@components/map/EnhancedClientMap';
import styles from '../routes/routes.module.css';
import polyline from '@mapbox/polyline';
import { HeatMapKonamiWrapper } from '@components/heatmap/HeatMapKonamiWrapper';

// Configuration for consistent DEFCON layers
const MAX_DEFCONS = 8; // Show last 8 DEFCON years
const CURRENT_YEAR = 2025; // DC33

export default async function Page() {
  const session = await auth();
  
  if (!session || !session.user?.email) {
    return (
      <div className={styles.routesContainer}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Please sign in to view the activity heat map</h2>
        </div>
      </div>
    );
  }

  // Fetch heat map data directly from database (server-side)
  const heatMapData = await fetchHeatMapData();

  return (
    <div className={styles.routesContainer}>
      <HeatMapKonamiWrapper stats={heatMapData.stats} routes={heatMapData.routes}>
        <div className={styles.mapWrapper}>
          <EnhancedClientMap 
            raw={JSON.stringify(heatMapData.routes)} 
            mqtt_nodes={JSON.stringify([])} 
            center={[36.1320813, -115.1667648]} 
            loadingText="🔥🔥🔥 DRAWING THE FIRE 🔥🔥🔥"
            loadingIndicator=" . . ."
            disableGhostMode={true}
            disablePopups={true}
            zoom={13}
          />
        </div>
      </HeatMapKonamiWrapper>
    </div>
  );
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

async function fetchHeatMapData() {
  try {
    // Fetch all activity accomplishments (which contain Strava data with polylines)
    const accomplishments = await getAllAccomplishmentsForType('activity');
    
    // Las Vegas bounding box (approximate)
    const LAS_VEGAS_BOUNDS = {
      north: 36.3,
      south: 35.95,
      east: -114.95,
      west: -115.35
    };
    
    // Helper function to check if a point is within Las Vegas bounds
    const isInLasVegas = (lat: number, lng: number): boolean => {
      return lat >= LAS_VEGAS_BOUNDS.south && 
             lat <= LAS_VEGAS_BOUNDS.north && 
             lng >= LAS_VEGAS_BOUNDS.west && 
             lng <= LAS_VEGAS_BOUNDS.east;
    };
    
    // Helper function to check if an activity is in Las Vegas area
    const isActivityInLasVegas = (decodedPoints: [number, number][]): boolean => {
      if (decodedPoints.length === 0) return false;
      
      // Check if at least 80% of points are within Las Vegas bounds
      // This allows for GPS drift and activities that might briefly go outside bounds
      const pointsInBounds = decodedPoints.filter(([lat, lng]) => isInLasVegas(lat, lng));
      return (pointsInBounds.length / decodedPoints.length) >= 0.8;
    };
    
    // Group accomplishments by year
    const accomplishmentsByYear = new Map<number, any[]>();
    
    let totalActivityCount = 0;
    let filteredOutCount = 0;
    
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
              console.log(`Parsed ${decodedPoints.length} points from JSON coordinate array`);
            }
          } catch {
            // If JSON parsing fails, try polyline decoding (for Strava data)
            decodedPoints = decodePolyline(metadata.summary_polyline);
          }
        }
        
        // If no Strava polyline, check for pre-selected route GPX URL
        if (decodedPoints.length === 0 && metadata?.gpxUrl) {
          console.log(`No Strava polyline for activity, fetching GPX from: ${metadata.gpxUrl}`);
          const gpxContent = await fetchGPXFromStrapi(metadata.gpxUrl);
          if (gpxContent) {
            decodedPoints = parseGPXToPoints(gpxContent);
            console.log(`Parsed ${decodedPoints.length} points from GPX`);
          }
        }
        
        // Check various possible GPX URL fields in metadata
        if (decodedPoints.length === 0) {
          const possibleGpxFields = [
            (metadata as any)?.gpx_url,
            (metadata as any)?.gpxURL,
            (metadata as any)?.gpx,
            (metadata as any)?.route_gpx_url, // New field from updated metadata
            (metadata as any)?.selectedRoute?.gpx_url,
            (metadata as any)?.selectedRoute?.gpxUrl,
            (metadata as any)?.route?.gpx_url,
            (metadata as any)?.route?.gpxUrl,
          ];
          
          for (const gpxField of possibleGpxFields) {
            if (gpxField && typeof gpxField === 'string') {
              console.log(`Found GPX URL in metadata: ${gpxField}`);
              const gpxContent = await fetchGPXFromStrapi(gpxField);
              if (gpxContent) {
                decodedPoints = parseGPXToPoints(gpxContent);
                if (decodedPoints.length > 0) {
                  console.log(`Successfully parsed ${decodedPoints.length} points from GPX`);
                  break;
                }
              }
            }
          }
        }
        
        // Log debug info for activities without points
        if (decodedPoints.length === 0 && metadata) {
          console.log(`No points found for accomplishment: ${accomplishment.name}`);
          console.log('Available metadata fields:', Object.keys(metadata));
          // Log specific fields that might contain route data
          if ((metadata as any).selectedRoute) {
            console.log('selectedRoute:', (metadata as any).selectedRoute);
          }
          if ((metadata as any).route) {
            console.log('route:', (metadata as any).route);
          }
          if (accomplishment.year === 2025) {
            console.log('DC33 activity with no points - full metadata:', JSON.stringify(metadata, null, 2));
          }
        }
        
        return {
          accomplishment,
          metadata,
          decodedPoints
        };
      })
    );
    
    // Now process the results synchronously
    for (const { accomplishment, metadata, decodedPoints } of processedAccomplishments) {
      if (decodedPoints.length > 0) {
        totalActivityCount++;
        
        // Only include activities that are in Las Vegas area
        if (isActivityInLasVegas(decodedPoints)) {
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
          filteredOutCount++;
        }
      }
    }
    
    console.log(`Heat map: ${totalActivityCount} total activities, ${filteredOutCount} filtered out (outside Las Vegas), ${totalActivityCount - filteredOutCount} included`);
    
    const routes: any[] = [];
    
    // Define consistent DEFCON years (always show these layers)
    const defconYears = Array.from({ length: MAX_DEFCONS }, (_, i) => CURRENT_YEAR - i);
    
    // Create routes for each DEFCON year (whether they have data or not)
    for (const year of defconYears) {
      const defconNumber = year - 1992; // DEFCON 1 was in 1993
      const yearAccomplishments = accomplishmentsByYear.get(year) || [];
      
      if (yearAccomplishments.length > 0) {
        // Create individual routes for each activity in this year
        for (let i = 0; i < yearAccomplishments.length; i++) {
          const { accomplishment, metadata, decodedPoints } = yearAccomplishments[i];
          const activityType = metadata.sport_type || metadata.activity_type || 'Activity';
          const activityName = `${activityType} #${i + 1}`;
          
          const route = {
            id: `activity_${year}_${i}`,
            name: activityName,
            color: '#ff0000',
            opacity: 0.7,
            weight: 4,
            lineCap: 'round',
            lineJoin: 'round',
            gpx: generateGPX(decodedPoints, activityName),
            hideMarkers: true,
            hideArrows: true,
            layers: [
              {
                title: 'ALL',
                sortKey: '000', // Sort first
                visible: true, // ALL layer is visible by default
              },
              {
                title: `DC${defconNumber}`,
                sortKey: String(100 - defconNumber).padStart(3, '0'),
                visible: false, // Individual layers start unchecked
              }
            ],
            attributes: {
              title: activityName,
              description: `${activityType} activity from DC${defconNumber}`,
              route_details: {
                activityType: activityType,
                distance: metadata.distance,
                movingTime: metadata.moving_time,
                year: year,
                defconNumber: defconNumber,
                userId: accomplishment.userId // Add the user ID for stats calculation
              }
            }
          };
          
          routes.push(route);
        }
      } else {
        // Create an empty placeholder route for years with no data
        const route = {
          id: `empty_${year}`,
          name: `No Data DC${defconNumber}`,
          color: '#ff0000',
          opacity: 0.7,
          weight: 4,
          lineCap: 'round',
          lineJoin: 'round',
          gpx: '<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="DEFCON.run Activity Heat Map"><trk><name>Empty</name><trkseg></trkseg></trk></gpx>',
          hideMarkers: true,
          hideArrows: true,
          layers: [
            {
              title: 'ALL',
              sortKey: '000',
              visible: true,
            },
            {
              title: `DC${defconNumber}`,
              sortKey: String(100 - defconNumber).padStart(3, '0'),
              visible: false, // Individual layers start unchecked
            }
          ],
          attributes: {
            title: `DC${defconNumber} (No Data)`,
            description: `No activities recorded for DC${defconNumber}`
          }
        };
        
        routes.push(route);
      }
    }
    
    // Calculate stats for overlay - only count data that contributes to heat map
    const totalRunners = new Set();
    let totalDistanceMeters = 0;
    let totalActivities = 0;
    
    accomplishmentsByYear.forEach((yearAccomplishments) => {
      for (const { accomplishment, metadata } of yearAccomplishments) {
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
      years: defconYears.length // Always show total possible years
    };
    
    console.log(`Generated heat map with ${routes.length} routes across ${defconYears.length} DEFCON years`, stats);
    
    return { routes, stats };
  } catch (error) {
    console.error('Error generating heat map data:', error);
    return { routes: [], stats: { totalRunners: 0, totalActivities: 0, totalDistanceKm: 0, totalDistanceMeters: 0, years: 0 } };
  }
}