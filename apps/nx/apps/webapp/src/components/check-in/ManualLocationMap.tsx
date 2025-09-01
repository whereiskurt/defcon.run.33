'use client';

import { useEffect, useRef, useState, useId } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import { Button } from '@heroui/react';
import { MapPin } from 'lucide-react';

interface ManualLocationMapProps {
  onLocationSelect: (coords: { latitude: number; longitude: number }) => void;
  initialCoords?: { latitude: number; longitude: number };
}

export default function ManualLocationMap({ onLocationSelect, initialCoords }: ManualLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const mapId = useId();
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(
    initialCoords || null
  );

  // Reset coordinates when initialCoords changes to null (after successful submission)
  useEffect(() => {
    if (initialCoords === null || initialCoords === undefined) {
      setSelectedCoords(null);
      // Clear marker from map if it exists
      if (markerRef.current && mapRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    } else if (initialCoords) {
      setSelectedCoords(initialCoords);
    }
  }, [initialCoords]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let timeoutId: NodeJS.Timeout;

    const initMap = async () => {
      // Clean up any existing map instance
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.warn('Error removing map:', e);
        }
        mapRef.current = null;
        markerRef.current = null;
      }

      // Clear the container and check if it exists
      if (!mapContainerRef.current) return;
      
      // Check if container already has a map initialized
      const container = mapContainerRef.current as any;
      if (container._leaflet_id) {
        console.warn('Map already initialized, clearing container');
        delete container._leaflet_id;
      }
      container.innerHTML = '';

      const L = (await import('leaflet')).default;
      // @ts-ignore - CSS import
      await import('leaflet/dist/leaflet.css');

      // Default to Las Vegas area
      const defaultCenter: [number, number] = [36.1699, -115.1398];
      
      // Double-check container still exists after async imports
      if (!mapContainerRef.current) return;
      
      const map = L.map(mapContainerRef.current, {
        center: initialCoords ? [initialCoords.latitude, initialCoords.longitude] : defaultCenter,
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom icon for the marker
      const customIcon = L.divIcon({
        html: `<div style="color: #3b82f6; font-size: 24px;">📍</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        className: 'custom-div-icon',
      });

      // Add initial marker if coords provided
      if (initialCoords) {
        const marker = L.marker([initialCoords.latitude, initialCoords.longitude], {
          icon: customIcon,
          draggable: true,
        }).addTo(map);
        
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const coords = { latitude: pos.lat, longitude: pos.lng };
          setSelectedCoords(coords);
          onLocationSelect(coords);
        });
        
        markerRef.current = marker;
      }

      // Handle map clicks
      map.on('click', (e) => {
        const coords = { latitude: e.latlng.lat, longitude: e.latlng.lng };
        
        // Remove existing marker if any
        if (markerRef.current) {
          markerRef.current.remove();
        }
        
        // Add new marker
        const marker = L.marker([coords.latitude, coords.longitude], {
          icon: customIcon,
          draggable: true,
        }).addTo(map);
        
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const newCoords = { latitude: pos.lat, longitude: pos.lng };
          setSelectedCoords(newCoords);
          onLocationSelect(newCoords);
        });
        
        markerRef.current = marker;
        setSelectedCoords(coords);
        onLocationSelect(coords);
      });

      mapRef.current = map;
    };

    // Small delay to ensure container is ready
    timeoutId = setTimeout(() => {
      initMap();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.warn('Error removing map in cleanup:', e);
        }
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  const centerOnUserLocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return;
    }
    
    if (!mapRef.current) {
      console.error('Map not initialized yet');
      return;
    }

    console.log('Getting user location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        
        console.log('Got user location:', coords);
        
        if (mapRef.current) {
          // Center map on user location with higher zoom
          mapRef.current.setView([coords.latitude, coords.longitude], 16);
          
          // Remove existing marker
          if (markerRef.current) {
            markerRef.current.remove();
          }
          
          const initMarker = async () => {
            const L = (await import('leaflet')).default;
            const customIcon = L.divIcon({
              html: `<div style="color: #3b82f6; font-size: 24px;">📍</div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 30],
              className: 'custom-div-icon',
            });
            
            const marker = L.marker([coords.latitude, coords.longitude], {
              icon: customIcon,
              draggable: true,
            }).addTo(mapRef.current!);
            
            marker.on('dragend', () => {
              const pos = marker.getLatLng();
              const newCoords = { latitude: pos.lat, longitude: pos.lng };
              setSelectedCoords(newCoords);
              onLocationSelect(newCoords);
            });
            
            markerRef.current = marker;
          };
          
          initMarker();
          setSelectedCoords(coords);
          onLocationSelect(coords);
          
          console.log('User location pin placed successfully');
        }
      },
      (error) => {
        console.error('Error getting user location:', error);
        let errorMessage = 'Unable to get your location';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        // You could show this error to the user if needed
        console.warn('Location error:', errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // Allow cached position up to 1 minute old
      }
    );
  };

  return (
    <div className="space-y-2">
      <div 
        ref={mapContainerRef} 
        key={mapId}
        className="h-64 w-full rounded-lg border border-default-200"
      />
      <div className="flex justify-between items-center">
        <p className="text-sm text-default-500">Click on the map to place your location</p>
        <Button
          size="sm"
          variant="flat"
          color="primary"
          onPress={centerOnUserLocation}
          startContent={<MapPin className="w-4 h-4" />}
        >
          Use My Location
        </Button>
      </div>
      {selectedCoords && (
        <p className="text-xs text-default-400 text-center">
          Selected: {selectedCoords.latitude.toFixed(6)}, {selectedCoords.longitude.toFixed(6)}
        </p>
      )}
    </div>
  );
}