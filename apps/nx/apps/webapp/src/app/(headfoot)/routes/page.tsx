import { strapi } from '@components/cms/data';
import RoutesListDisplay from '@components/routes/RoutesListDisplay';
import { env } from 'process';

// Add revalidation for the entire page - cache for 5 minutes
export const revalidate = 300; // 5 minutes in seconds

export default async function Page() {
  const nodesUrl = env['MESHMAP_NODES_URL'] || 'https://mqtt.defcon.run/map/nodes.json';
  
  const routes = await strapi("/routes?populate=*");
  const mqtt_nodes = await livenodes(nodesUrl);

  // Debug: Check what fields are available
  if (routes.data && routes.data.length > 0) {
    const firstRoute = routes.data[0];
  }

  // Fetch GPX data server-side to avoid CORS issues
  const routesWithGPX = await Promise.all(routes.data.map(async (route: any, index: number) => {
    // Check all possible GPX field names (v5 structure - no attributes)
    const gpxUrl = route.gpxurl || 
                   route.gpxUrl || 
                   route.gpx ||
                   route.GPX ||
                   route.gpx_url;
    
    if (index === 0) {
    }
    
    if (gpxUrl) {
      try {
        const fullUrl = gpxUrl.startsWith('http') 
          ? gpxUrl 
          : `${process.env.STRAPI_URL || 'https://strapi.defcon.run'}${gpxUrl}`;
        
        
        const gpxResponse = await fetch(fullUrl, {
          headers: {
            'Authorization': `bearer ${process.env.AUTH_STRAPI_TOKEN}`
          },
          next: { revalidate: 300 } // Cache GPX data for 5 minutes
        });
        
        if (gpxResponse.ok) {
          const gpxContent = await gpxResponse.text();
          // Extract polyline from GPX
          const polyline = extractPolylineFromGPX(gpxContent);
          return {
            ...route,
            polyline: polyline
          };
        } else {
          console.error(`GPX fetch failed for ${route.name}: ${gpxResponse.status}`);
        }
      } catch (error) {
        console.error('Error fetching GPX for route:', route.name, error);
      }
    }
    return route;
  }));

  return (
    <div className="container mx-auto py-4">
      <RoutesListDisplay 
        initialRoutes={JSON.stringify(routesWithGPX)} 
        mqttNodes={JSON.stringify(mqtt_nodes)} 
      />
    </div>
  );
}

// Extract coordinates from GPX and encode as polyline
function extractPolylineFromGPX(gpxContent: string): string {
  try {
    // Extract coordinates using regex
    const coordsRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g;
    const points: [number, number][] = [];
    let match;
    
    while ((match = coordsRegex.exec(gpxContent)) !== null) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lon)) {
        points.push([lat, lon]);
      }
    }
    
    // If no track points, try route points
    if (points.length === 0) {
      const routeRegex = /<rtept\s+lat="([^"]+)"\s+lon="([^"]+)"/g;
      while ((match = routeRegex.exec(gpxContent)) !== null) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lon)) {
          points.push([lat, lon]);
        }
      }
    }
    
    // Encode points as polyline
    if (points.length > 0) {
      return encodePolyline(points);
    }
  } catch (error) {
    console.error('Error parsing GPX:', error);
  }
  return '';
}

// Encode coordinates as Google polyline format
function encodePolyline(points: [number, number][]): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of points) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);
    
    const dLat = latE5 - prevLat;
    const dLng = lngE5 - prevLng;
    
    encoded += encodeValue(dLat) + encodeValue(dLng);
    
    prevLat = latE5;
    prevLng = lngE5;
  }
  
  return encoded;
}

function encodeValue(value: number): string {
  let encoded = '';
  value = value < 0 ? ~(value << 1) : (value << 1);
  
  while (value >= 0x20) {
    encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
    value >>= 5;
  }
  
  encoded += String.fromCharCode(value + 63);
  return encoded;
}

async function livenodes(url: string) {
  const res = await fetch(`${url}`, {
    method: 'GET',
    headers: {
      'Authorization': `bearer ${process.env.AUTH_STRAPI_TOKEN}`
    },
    next: { revalidate: 30 }
  });

  if (!res.ok) {
    throw new Error(`Network response was not ok: ${res.status}-${res.statusText}:${url}`);
  }
  const data = await res.json();
  return data;
}