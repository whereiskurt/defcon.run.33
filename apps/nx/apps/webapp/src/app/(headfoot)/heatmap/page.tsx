'use server';

import { auth } from '@auth';
import { getAllAccomplishmentsForType } from '@db/accomplishment';
import EnhancedClientMap from '@components/map/EnhancedClientMap';
import styles from '../routes/routes.module.css';
import polyline from '@mapbox/polyline';
import { HeatMapKonamiWrapper } from '@components/heatmap/HeatMapKonamiWrapper';

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
            loadingText="DRAWING THE FIRE!"
            disableGhostMode={true}
            zoom={12}
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
    
    // Group accomplishments by year to create separate layers
    const accomplishmentsByYear = new Map<number, any[]>();
    
    for (const accomplishment of accomplishments) {
      const metadata = accomplishment.metadata;
      
      // Check if we have a polyline
      if (metadata?.summary_polyline) {
        const decodedPoints = decodePolyline(metadata.summary_polyline);
        
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
        }
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
          const { accomplishment, metadata, decodedPoints } = yearAccomplishments[i];
          const activityType = metadata.sport_type || metadata.activity_type || 'Activity';
          const activityName = `${activityType} #${i + 1}`;
          
          const route = {
            id: `activity_${year}_${i}`,
            name: activityName,
            color: '#ff0000', // Red color for heat map
            opacity: 0.7, // More opaque for highlighter effect
            weight: 8, // Much thicker lines like highlighter
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
      years: accomplishmentsByYear.size
    };
    
    console.log(`Generated heat map with ${routes.length} routes across ${accomplishmentsByYear.size} years`, stats);
    
    return { routes, stats };
  } catch (error) {
    console.error('Error generating heat map data:', error);
    return { routes: [], stats: { totalRunners: 0, totalActivities: 0, totalDistanceKm: 0, totalDistanceMeters: 0, years: 0 } };
  }
}