'use client';

import { useEffect, useRef } from 'react';

interface PolylineRendererProps {
  polyline: string;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  padding?: number;
  showMapTile?: boolean;
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

// Calculate optimal zoom level for the bounds
function calculateZoomLevel(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }, width: number, height: number): number {
  const latDiff = bounds.maxLat - bounds.minLat;
  const lngDiff = bounds.maxLng - bounds.minLng;
  
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
  width = 200,
  height = 150,
  strokeColor = '#3B82F6',
  strokeWidth = 2,
  padding = 10,
  showMapTile = true,
}: PolylineRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!polyline || !canvasRef.current) {
      console.log('PolylineRenderer: Missing polyline or canvas ref', { polyline: !!polyline, canvas: !!canvasRef.current });
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('PolylineRenderer: Could not get 2d context');
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const renderPolylineOnly = async () => {
      try {
        console.log('PolylineRenderer: Decoding polyline:', polyline.substring(0, 50) + '...');
        
        // Decode polyline
        const points = decodePolyline(polyline);
        console.log('PolylineRenderer: Decoded points:', points.length);
        
        if (points.length < 2) {
          console.log('PolylineRenderer: Not enough points to draw');
          // Draw "No data" text
          ctx.fillStyle = '#999';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('No data', width / 2, height / 2);
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

        // Load map tile as background if enabled
        if (showMapTile) {
          try {
            const zoom = calculateZoomLevel(bounds, width, height);
            const centerLat = (minLat + maxLat) / 2;
            const centerLng = (minLng + maxLng) / 2;
            const centerTile = latLngToTile(centerLat, centerLng, zoom);
            
            const tileUrl = `https://tile.openstreetmap.org/${zoom}/${centerTile.x}/${centerTile.y}.png`;
            console.log('Loading tile:', tileUrl);
            
            const tileImage = new Image();
            tileImage.crossOrigin = 'anonymous';
            
            tileImage.onload = () => {
              console.log('Tile loaded successfully');
              
              // Calculate tile bounds in lat/lng
              const tileBounds = {
                topLeft: tileToLatLng(centerTile.x, centerTile.y, zoom),
                bottomRight: tileToLatLng(centerTile.x + 1, centerTile.y + 1, zoom)
              };
              
              // Draw tile as background
              ctx.drawImage(tileImage, 0, 0, width, height);
              
              // Draw semi-transparent overlay to make polyline more visible
              ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
              ctx.fillRect(0, 0, width, height);
              
              // Now draw the polyline on top
              drawPolyline();
            };
            
            tileImage.onerror = () => {
              console.log('Tile failed to load, drawing polyline without background');
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

        function drawPolyline() {
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
        }

      } catch (error) {
        console.error('Error rendering polyline:', error);
      }
    };

    renderPolylineOnly();
  }, [polyline, width, height, strokeColor, strokeWidth, padding]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-default-200 rounded-lg bg-default-50"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}