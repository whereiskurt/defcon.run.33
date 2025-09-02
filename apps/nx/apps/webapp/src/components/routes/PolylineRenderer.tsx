'use client';

import { useEffect, useRef, useMemo } from 'react';

interface PolylineRendererProps {
  polyline?: string;
  gpxUrl?: string;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  padding?: number;
  showMapTile?: boolean;
  theme?: string;
}

// Decode Google polyline format
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

// Convert lat/lng to tile coordinates
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  return { x, y };
}

// Convert tile coordinates back to lat/lng
function tileToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
  const lat = (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
  const lng = x / Math.pow(2, zoom) * 360 - 180;
  return { lat, lng };
}

// Parse GPX XML and extract coordinates
function parseGPX(gpxContent: string): [number, number][] {
  const points: [number, number][] = [];
  
  try {
    // Parse GPX XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(gpxContent, 'text/xml');
    
    // Look for trackpoints
    const trackpoints = doc.getElementsByTagName('trkpt');
    for (let i = 0; i < trackpoints.length; i++) {
      const lat = parseFloat(trackpoints[i].getAttribute('lat') || '0');
      const lon = parseFloat(trackpoints[i].getAttribute('lon') || '0');
      if (!isNaN(lat) && !isNaN(lon)) {
        points.push([lat, lon]);
      }
    }
    
    // Also check for route points if no trackpoints found
    if (points.length === 0) {
      const routepoints = doc.getElementsByTagName('rtept');
      for (let i = 0; i < routepoints.length; i++) {
        const lat = parseFloat(routepoints[i].getAttribute('lat') || '0');
        const lon = parseFloat(routepoints[i].getAttribute('lon') || '0');
        if (!isNaN(lat) && !isNaN(lon)) {
          points.push([lat, lon]);
        }
      }
    }
  } catch (error) {
    console.error('Error parsing GPX:', error);
  }
  
  return points;
}

// Calculate optimal zoom level for the bounds
function calculateZoomLevel(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }): number {
  
  // Start from zoom 15 and work down until the bounds fit in one tile
  for (let zoom = 15; zoom >= 10; zoom--) {
    const topLeft = latLngToTile(bounds.maxLat, bounds.minLng, zoom);
    const bottomRight = latLngToTile(bounds.minLat, bounds.maxLng, zoom);
    
    // If bounds fit within 1-2 tiles, this zoom level is good
    if (bottomRight.x - topLeft.x <= 1 && bottomRight.y - topLeft.y <= 1) {
      return zoom;
    }
  }
  return 12; // Fallback zoom
}

export default function PolylineRenderer({
  polyline,
  gpxUrl,
  width = 200,
  height = 150,
  strokeColor = '#3B82F6',
  strokeWidth = 2,
  padding = 10,
  showMapTile = true,
  theme = 'light',
}: PolylineRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Unified theme detection: ONLY use the passed theme prop for consistency
  const isDarkMode = theme === "dark";
  
  // Memoize polyline decoding to avoid re-computation on every render
  const decodedPoints = useMemo(() => {
    if (!polyline) return [];
    return decodePolyline(polyline);
  }, [polyline]);
  

  useEffect(() => {
    
    if (!polyline || !canvasRef.current || decodedPoints.length === 0) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Clear canvas and add debug background
    ctx.clearRect(0, 0, width, height);
    
    // Debug: Draw a light background to see if canvas is rendering
    ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, 0, width, height);

    const renderPolylineOnly = async () => {
      try {
        // Use pre-decoded points from useMemo
        const points = decodedPoints;
        
        if (points.length < 2) {
          // Draw "No data" text
          ctx.fillStyle = isDarkMode ? '#666' : '#999';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('No route data', width / 2, height / 2);
          return;
        }

        // Find bounds
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;

        points.forEach(([lat, lng]) => {
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
        });

        const bounds = { minLat, maxLat, minLng, maxLng };

        // Define drawPolyline function before using it
        const drawPolyline = () => {
          // Calculate scale to fit the route in the canvas
          const latRange = maxLat - minLat || 0.001;
          const lngRange = maxLng - minLng || 0.001;
          
          const scaleX = (width - 2 * padding) / lngRange;
          const scaleY = (height - 2 * padding) / latRange;
          const scale = Math.min(scaleX, scaleY);

          // Center the route in the canvas
          const offsetX = (width - lngRange * scale) / 2;
          const offsetY = (height - latRange * scale) / 2;

          // Convert lat/lng to canvas coordinates
          const toCanvas = (lat: number, lng: number): [number, number] => {
            const x = (lng - minLng) * scale + offsetX;
            const y = height - ((lat - minLat) * scale + offsetY); // Flip Y axis
            return [x, y];
          };

          // Draw the route with thicker stroke for better visibility on map
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = showMapTile ? strokeWidth + 2 : strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Add white outline for better contrast on map tiles
          if (showMapTile) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = strokeWidth + 4;
            ctx.beginPath();
            const [startLat, startLng] = points[0];
            const [startX, startY] = toCanvas(startLat, startLng);
            ctx.moveTo(startX, startY);
            for (let i = 1; i < points.length; i++) {
              const [lat, lng] = points[i];
              const [x, y] = toCanvas(lat, lng);
              ctx.lineTo(x, y);
            }
            ctx.stroke();
          }

          // Draw main route line
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = showMapTile ? strokeWidth + 1 : strokeWidth;
          ctx.beginPath();
          const [startLat, startLng] = points[0];
          const [startX, startY] = toCanvas(startLat, startLng);
          ctx.moveTo(startX, startY);

          for (let i = 1; i < points.length; i++) {
            const [lat, lng] = points[i];
            const [x, y] = toCanvas(lat, lng);
            ctx.lineTo(x, y);
          }

          ctx.stroke();

          // Add start and end markers with better visibility
          const markerRadius = showMapTile ? 6 : 4;
          
          // Start marker (green circle)
          const [firstX, firstY] = toCanvas(points[0][0], points[0][1]);
          // White outline
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(firstX, firstY, markerRadius + 1, 0, 2 * Math.PI);
          ctx.fill();
          // Green center
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.arc(firstX, firstY, markerRadius, 0, 2 * Math.PI);
          ctx.fill();

          // End marker (red circle)
          const lastPoint = points[points.length - 1];
          const [lastX, lastY] = toCanvas(lastPoint[0], lastPoint[1]);
          // White outline
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(lastX, lastY, markerRadius + 1, 0, 2 * Math.PI);
          ctx.fill();
          // Red center
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(lastX, lastY, markerRadius, 0, 2 * Math.PI);
          ctx.fill();
        };

        // Load map tile as background if enabled
        if (showMapTile) {
          try {
            const zoom = calculateZoomLevel(bounds);
            const centerLat = (minLat + maxLat) / 2;
            const centerLng = (minLng + maxLng) / 2;
            const centerTile = latLngToTile(centerLat, centerLng, zoom);
            
            const tileUrl = `https://tile.openstreetmap.org/${zoom}/${centerTile.x}/${centerTile.y}.png`;
            
            const tileImage = new Image();
            tileImage.crossOrigin = 'anonymous';
            
            tileImage.onload = () => {
              
              // Draw tile as background
              if (isDarkMode) {
                // Apply dark mode filter to canvas - same as main map for consistency
                ctx.filter = 'invert(1) hue-rotate(180deg) brightness(1.2) contrast(0.9)';
                ctx.drawImage(tileImage, 0, 0, width, height);
                ctx.filter = 'none'; // Reset filter for subsequent drawing
              } else {
                ctx.drawImage(tileImage, 0, 0, width, height);
              }
              
              // Draw semi-transparent overlay to make polyline more visible
              ctx.fillStyle = isDarkMode 
                ? 'rgba(0, 0, 0, 0.2)' 
                : 'rgba(255, 255, 255, 0.2)';
              ctx.fillRect(0, 0, width, height);
              
              // Now draw the polyline on top
              drawPolyline();
            };
            
            tileImage.onerror = () => {
              drawPolyline();
            };
            
            tileImage.src = tileUrl;
          } catch (error) {
            console.error('Error loading map tile:', error);
            drawPolyline();
          }
        } else {
          drawPolyline();
        }

      } catch (error) {
        console.error('Error rendering polyline:', error);
      }
    };

    renderPolylineOnly();
  }, [decodedPoints, width, height, strokeColor, strokeWidth, padding, showMapTile, isDarkMode]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`border rounded-lg ${
        isDarkMode 
          ? 'border-default-600 bg-default-900' 
          : 'border-default-200 bg-default-50'
      }`}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}