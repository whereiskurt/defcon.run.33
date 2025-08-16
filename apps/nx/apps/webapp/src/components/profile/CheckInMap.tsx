'use client';

import { useEffect, useRef } from 'react';
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
}

interface CheckInMapProps {
  checkIns: CheckIn[];
  selectedCheckIn: CheckIn | null;
  onCheckInSelect: (checkIn: CheckIn | null) => void;
}

export default function CheckInMap({ checkIns, selectedCheckIn, onCheckInSelect }: CheckInMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [36.1070, -115.1441], // Default to Las Vegas (DEFCON location)
      zoom: 13,
      zoomControl: true,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !markersRef.current) return;

    // Clear existing markers
    markersRef.current.clearLayers();

    if (checkIns.length === 0) return;

    const bounds = L.latLngBounds([]);
    
    checkIns.forEach((checkIn, index) => {
      const latitude = checkIn.averageCoordinates?.latitude;
      const longitude = checkIn.averageCoordinates?.longitude;
      
      if (!latitude || !longitude) return;
      
      const isSelected = selectedCheckIn === checkIn;
      
      // Create custom icon based on selection and accuracy
      const color = isSelected ? '#006FEE' : (checkIn.bestAccuracy || 0) < 10 ? '#17C964' : (checkIn.bestAccuracy || 0) < 20 ? '#F5A524' : '#F31260';
      const iconSize = isSelected ? 35 : 25;
      
      const customIcon = L.divIcon({
        html: `
          <div style="
            background-color: ${color};
            width: ${iconSize}px;
            height: ${iconSize}px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${iconSize > 30 ? '14px' : '11px'};
          ">
            ${index + 1}
          </div>
        `,
        className: 'custom-marker',
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2],
      });

      const marker = L.marker([latitude, longitude], { icon: customIcon })
        .bindPopup(`
          <div style="min-width: 200px;">
            <strong>Check-In #${index + 1}</strong><br/>
            <small>${new Date(checkIn.timestamp || 0).toLocaleString()}</small><br/>
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

    // Fit map to show all markers
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] });
      
      // If only one check-in, set a reasonable zoom level
      if (checkIns.length === 1) {
        mapInstanceRef.current.setZoom(16);
      }
    }
  }, [checkIns, selectedCheckIn, onCheckInSelect]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {/* Legend */}
      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg text-xs">
        <div className="space-y-1">
          <div className="font-semibold">Accuracy</div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span>&lt; 10m (Excellent)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <span>&lt; 20m (Good)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-danger"></div>
            <span>≥ 20m (Fair)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span>Selected</span>
          </div>
        </div>
      </div>
      
      {/* Sample count info */}
      {selectedCheckIn && (
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg text-xs">
          <div className="font-semibold">Selected Check-In</div>
          <div>Large marker: Average position</div>
          <div>Small dots: Individual GPS samples</div>
          <div>Dashed circle: Accuracy radius</div>
        </div>
      )}
    </div>
  );
}