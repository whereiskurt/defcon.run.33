'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface GPSSample {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface CheckIn {
  date?: string;
  timestamp?: number;
  source?: string;
  samples?: any;
  averageCoordinates?: {
    latitude?: number;
    longitude?: number;
  };
  bestAccuracy?: number;
  userAgent?: string;
  isPrivate?: boolean;
}

interface CheckInMapProps {
  checkIns: CheckIn[];
  selectedCheckIn: CheckIn | null;
  onCheckInSelect: (checkIn: CheckIn | null) => void;
  isExpanded?: boolean;
}

export default function CheckInMap({ checkIns, selectedCheckIn, onCheckInSelect, isExpanded }: CheckInMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [legendVisible, setLegendVisible] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [36.1070, -115.1441], // Default to Las Vegas (DEFCON location)
      zoom: 13,
      zoomControl: true,
    });

    // Add tile layer (will be set based on theme)
    const tileUrl = theme === 'dark' 
      ? 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    
    const tileAttribution = theme === 'dark'
      ? '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="http://cartodb.com/attributions">CartoDB</a>'
      : '© OpenStreetMap contributors';

    const tileLayer = L.tileLayer(tileUrl, {
      attribution: tileAttribution,
    }).addTo(map);

    mapInstanceRef.current = map;
    tileLayerRef.current = tileLayer;
    markersRef.current = L.layerGroup().addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update tile layer when theme changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const tileUrl = theme === 'dark' 
      ? 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    
    const tileAttribution = theme === 'dark'
      ? '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="http://cartodb.com/attributions">CartoDB</a>'
      : '© OpenStreetMap contributors';

    // Remove old tile layer
    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    
    // Add new tile layer
    const newTileLayer = L.tileLayer(tileUrl, {
      attribution: tileAttribution,
    }).addTo(mapInstanceRef.current);
    
    tileLayerRef.current = newTileLayer;
  }, [theme]);

  // Handle map resize when expanded state changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    // Use setTimeout to ensure the container has finished its CSS transition
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize(true);
    }, 350); // Slightly longer than the 300ms transition
    
    return () => clearTimeout(timer);
  }, [isExpanded]);

  useEffect(() => {
    if (!mapInstanceRef.current || !markersRef.current) return;

    // Clear existing markers
    markersRef.current.clearLayers();

    if (checkIns.length === 0) return;

    const bounds = L.latLngBounds([]);
    let selectedLatLng: [number, number] | null = null;
    
    checkIns.forEach((checkIn, index) => {
      const latitude = checkIn.averageCoordinates?.latitude;
      const longitude = checkIn.averageCoordinates?.longitude;
      
      if (!latitude || !longitude) return;
      
      const isSelected = selectedCheckIn === checkIn;
      
      // Track selected check-in coordinates for zooming
      if (isSelected) {
        selectedLatLng = [latitude, longitude];
      }
      
      // Create custom icon based on source type
      const isWeb = checkIn.source === 'Web GPS' || checkIn.source === 'Web';
      const color = isWeb ? '#006FEE' : '#17C964'; // Blue for Web, Green for Meshtastic
      const iconSize = isSelected ? 35 : 25;
      const isPrivate = checkIn.isPrivate || false;
      
      // Lock icon SVG for private check-ins
      const lockIcon = isPrivate ? `
        <svg style="
          position: absolute;
          top: -2px;
          right: -2px;
          width: ${iconSize > 30 ? '14px' : '10px'};
          height: ${iconSize > 30 ? '14px' : '10px'};
          fill: white;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
        " viewBox="0 0 24 24">
          <path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7z"/>
        </svg>
      ` : '';
      
      const customIcon = L.divIcon({
        html: `
          <div style="
            position: relative;
            background-color: ${color};
            width: ${iconSize}px;
            height: ${iconSize}px;
            border-radius: 50%;
            border: 3px solid ${isPrivate ? '#FFA500' : 'white'};
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${iconSize > 30 ? '14px' : '11px'};
          ">
            ${index + 1}
            ${lockIcon}
          </div>
        `,
        className: 'custom-marker',
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2],
      });

      const marker = L.marker([latitude, longitude], { icon: customIcon })
        .bindPopup(`
          <div style="min-width: 200px;">
            <strong>Check-In #${index + 1}</strong> ${isPrivate ? '🔒' : '🌐'}<br/>
            <small>${new Date(checkIn.timestamp || 0).toLocaleString()}</small><br/>
            <strong>Privacy:</strong> ${isPrivate ? 'Private' : 'Public'}<br/>
            <strong>Coordinates:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}<br/>
            <strong>Accuracy:</strong> ±${(checkIn.bestAccuracy || 0).toFixed(1)}m<br/>
            <strong>Samples:</strong> ${(checkIn.samples || []).length}<br/>
            <strong>Source:</strong> ${checkIn.source || 'Unknown'}
          </div>
        `)
        .on('click', () => {
          onCheckInSelect(isSelected ? null : checkIn);
        });

      markersRef.current!.addLayer(marker);
      bounds.extend([latitude, longitude]);

      // Add accuracy circle for selected check-in
      if (isSelected) {
        const accuracyCircle = L.circle([latitude, longitude], {
          radius: checkIn.bestAccuracy || 10,
          color: color,
          fillColor: color,
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 5',
        }).bindPopup(`Accuracy radius: ±${(checkIn.bestAccuracy || 0).toFixed(1)}m`);
        
        markersRef.current!.addLayer(accuracyCircle);

        // Add individual sample points for selected check-in
        (checkIn.samples || []).forEach((sample: any, sampleIndex: number) => {
          const sampleIcon = L.divIcon({
            html: `
              <div style="
                background-color: ${color};
                width: 8px;
                height: 8px;
                border-radius: 50%;
                border: 1px solid white;
                opacity: 0.7;
              "></div>
            `,
            className: 'sample-marker',
            iconSize: [8, 8],
            iconAnchor: [4, 4],
          });

          const sampleMarker = L.marker([sample.latitude, sample.longitude], { icon: sampleIcon })
            .bindPopup(`
              <div>
                <strong>Sample ${sampleIndex + 1}</strong><br/>
                <small>${new Date(sample.timestamp).toLocaleTimeString()}</small><br/>
                <strong>Accuracy:</strong> ±${sample.accuracy.toFixed(1)}m<br/>
                ${sample.altitude !== null ? `<strong>Altitude:</strong> ${sample.altitude.toFixed(1)}m<br/>` : ''}
                ${sample.speed !== null ? `<strong>Speed:</strong> ${sample.speed.toFixed(1)}m/s<br/>` : ''}
              </div>
            `);

          markersRef.current!.addLayer(sampleMarker);
          bounds.extend([sample.latitude, sample.longitude]);
        });
      }
    });

    // Handle zooming based on selection
    if (selectedLatLng) {
      // Zoom into selected check-in with smooth animation
      mapInstanceRef.current.setView(selectedLatLng, 17, {
        animate: true,
        duration: 0.5
      });
    } else if (bounds.isValid()) {
      // No selection - fit map to show all markers
      mapInstanceRef.current.fitBounds(bounds, { 
        padding: [30, 30],
        animate: true,
        duration: 0.5
      });
      
      // If only one check-in, set a reasonable zoom level
      if (checkIns.length === 1) {
        mapInstanceRef.current.setZoom(16);
      }
    }
  }, [checkIns, selectedCheckIn, onCheckInSelect]);

  // Calculate check-in source and privacy counts
  const sourceCounts = checkIns.reduce((acc, checkIn) => {
    const source = checkIn.source || 'Unknown';
    const sourceType = source === 'Web GPS' ? 'Web' : 'Meshtastic';
    acc[sourceType] = (acc[sourceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const privacyCounts = checkIns.reduce((acc, checkIn) => {
    const privacyType = checkIn.isPrivate ? 'Private' : 'Public';
    acc[privacyType] = (acc[privacyType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {/* Show Legend Button when hidden */}
      {!legendVisible && (
        <button
          className="absolute top-2 right-2 rounded-lg px-3 py-2 shadow-lg bg-content1 border border-divider hover:bg-content2 transition-colors flex items-center gap-2"
          style={{
            backdropFilter: 'blur(8px)',
            zIndex: 400,
          }}
          onClick={() => setLegendVisible(true)}
          aria-label="Show legend"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-sm font-medium">Legend</span>
        </button>
      )}
      
      {/* Check-in Source Summary Legend */}
      {legendVisible && (
        <div 
          className="absolute top-2 right-2 rounded-lg p-3 shadow-lg text-sm bg-content1 border border-divider transition-all duration-300"
          style={{
            backdropFilter: 'blur(8px)',
            zIndex: 400,
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-base text-foreground">CheckIn</div>
              <button
                className="rounded-lg p-1.5 hover:bg-content2 transition-colors"
                onClick={() => setLegendVisible(false)}
                aria-label="Hide legend"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-full border border-content3"
                    style={{ backgroundColor: '#006FEE' }}
                  ></div>
                  <span className="text-foreground">Web GPS</span>
                </div>
                <span className="font-semibold text-foreground">{sourceCounts['Web'] || 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-full border border-content3"
                    style={{ backgroundColor: '#17C964' }}
                  ></div>
                  <span className="text-foreground">Meshtastic</span>
                </div>
                <span className="font-semibold text-foreground">{sourceCounts['Meshtastic'] || 0}</span>
              </div>
              <div className="border-t border-divider pt-1 mt-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-foreground">🌐 Public</span>
                  </div>
                  <span className="font-semibold text-foreground">{privacyCounts['Public'] || 0}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-foreground">🔒 Private</span>
                  </div>
                  <span className="font-semibold text-foreground">{privacyCounts['Private'] || 0}</span>
                </div>
              </div>
              <div className="border-t border-divider pt-1 mt-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="font-bold text-foreground">{checkIns.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}