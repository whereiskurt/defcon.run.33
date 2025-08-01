'use client';

import * as L from 'leaflet';
import { LatLngExpression, LatLngTuple } from 'leaflet';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-gpx';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

interface MapProps {
  center: LatLngExpression | LatLngTuple;
  raw: string;
  live_nodes: string;
  zoom?: number;
  theme: string;
}

const defaults = {
  zoom: 13,
};

interface RawOverlayMap {
  [key: string]: {
    layer: L.LayerGroup;
    sortKey: string;
    visible: boolean;
  };
}

interface OverlayMap {
  [key: string]: L.LayerGroup;
}



function parseGPX(gpxString: string): [number, number][] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxString, 'application/xml');

  const trkpts = xmlDoc.getElementsByTagName('trkpt');
  const rtept = xmlDoc.getElementsByTagName('rtept');
  const wpts = xmlDoc.getElementsByTagName('wpt');

  // Prefer trkpts, then rtept, then wpt
  const points = trkpts.length ? trkpts : (rtept.length ? rtept : wpts);
  const coordinates: [number, number][] = [];

  for (let i = 0; i < points.length; i++) {
    const lat = parseFloat(points[i].getAttribute('lat') || '0');
    const lon = parseFloat(points[i].getAttribute('lon') || '0');
    coordinates.push([lat, lon]);
  }

  return coordinates;
}

const Map = ({ center: posix, raw, zoom = defaults.zoom, live_nodes, theme }: MapProps) => {
  return (
    <MapContainer
      center={posix}
      zoom={zoom}
      style={{ zIndex: '0', height: 'calc(100dvh - 140px)', width: '100%' }}
    >

      {theme === "dark" ? (
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        />
      ) : (
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        />
      )}
{/* 
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      /> */}

      {/* <TileLayer
        url="https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
      /> */}

      <AddGPXLayer raw={raw} live_nodes={live_nodes} />
    </MapContainer>
  );
};

  // Generate marker color based on shortName
  const getMarkerColorFromNodeName = (shortName: string, longName: string | string[]) => {

    if (!shortName || !longName) {
      return '#00ff00'; // Default to Matrix green
    }

    // All ghosts are now Matrix green
    return '#00ff00';
  }

const AddGPXLayer = ({ raw, live_nodes }: { raw: string, live_nodes: string }) => {
  const hasMounted = useRef(false);
  const map = useMap();
  const routes = JSON.parse(raw);
  const liveLayerRef = useRef<L.LayerGroup | null>(null);
  const [showLiveNodes, setShowLiveNodes] = useState(false);
  const keySequence = useRef<string[]>([]);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const SPECIAL_SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }

      const key = e.key === 'B' ? 'b' : e.key === 'A' ? 'a' : e.key;
      keySequence.current.push(key);

      if (keySequence.current.length > SPECIAL_SEQUENCE.length) {
        keySequence.current.shift();
      }

      if (keySequence.current.length === SPECIAL_SEQUENCE.length &&
          keySequence.current.every((key, index) => key === SPECIAL_SEQUENCE[index])) {
        const newState = !showLiveNodes;
        setShowLiveNodes(newState);
        keySequence.current = [];
        
        const flash = document.createElement('div');
        flash.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #00ff00;
          color: #000;
          padding: 20px;
          font-family: 'Courier New', monospace;
          font-size: 24px;
          font-weight: bold;
          z-index: 9999;
          border: 2px solid #00ff00;
          box-shadow: 0 0 20px #00ff00;
          text-shadow: 0 0 5px #00ff00;
        `;
        flash.textContent = newState ? 'GHOST MODE ACTIVATED' : 'GHOST MODE DEACTIVATED';
        document.body.appendChild(flash);
        setTimeout(() => document.body.removeChild(flash), 1500);
      }

      sequenceTimeoutRef.current = setTimeout(() => {
        keySequence.current = [];
      }, 10000);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (liveLayerRef.current && map) {
      if (showLiveNodes) {
        map.addLayer(liveLayerRef.current);
      } else {
        map.removeLayer(liveLayerRef.current);
      }
    }
  }, [showLiveNodes, map]);

  useEffect(() => {

    if (hasMounted.current) return;

    if (map) {
      var rawOverlay: RawOverlayMap = {};

      const liveLayer = new L.LayerGroup();
      liveLayerRef.current = liveLayer;

      routes.forEach((route: any) => {
        const layers = route.layers;
        layers.forEach((layer: any) => {
          const layerTitle = layer.title;
          const sortKey = layer.sortKey || '';
          const visible = layer.visible as boolean;

          if (!rawOverlay[layerTitle]) {
            rawOverlay[layerTitle] = {
              layer: new L.LayerGroup(),
              sortKey,
              visible,
            };
          }
          if (visible) {
            const mainLayer = rawOverlay[layerTitle].layer;
            drawRoute(route, mainLayer);
            map.addLayer(mainLayer);
          }
        });
        if (route.makeNameLayer) {
          const sortKey = route.sortKey;
          rawOverlay[route.name] = {
            layer: new L.LayerGroup(),
            sortKey: sortKey,
            visible: true,
          };
          drawRoute(route, rawOverlay[route.name].layer);
        }
      });

      const overlayMaps: OverlayMap = Object.entries(rawOverlay)
        .sort(([, a], [, b]) => a.sortKey.localeCompare(b.sortKey))
        .reduce((acc, [key, value]) => {
          if (!value.visible) return acc;
          acc[key] = value.layer;
          return acc;
        }, {} as OverlayMap);

        
      // const liveLayer = new L.LayerGroup();
      // overlayMaps['Live MQTT Nodes'] = liveLayer;
      
      // Parse and add live nodes to the map
      if (live_nodes && live_nodes.length > 0) {
        try {
          const nodesMap = JSON.parse(live_nodes);
          Object.entries(nodesMap).forEach(([id, nodeData]: [string, any]) => {
            // Convert from integer format to decimal degrees
            const lat = nodeData.latitude / 10000000;
            const lng = nodeData.longitude / 10000000;

            const color = getMarkerColorFromNodeName(nodeData.shortName, nodeData.longName);

            const ghostMarkerSettings = {
              mapIconUrl:
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><path fill="{ghostColor}" stroke="#FFF" stroke-width="3" d="M50 10 C30 10 15 25 15 45 L15 80 C15 85 17 88 20 85 L25 80 C28 77 32 77 35 80 L40 85 C43 88 47 88 50 85 L55 80 C58 77 62 77 65 80 L70 85 C73 88 77 88 80 85 L85 80 C88 77 85 85 85 80 L85 45 C85 25 70 10 50 10 Z"/><circle fill="#000" cx="35" cy="40" r="5"/><circle fill="#000" cx="65" cy="40" r="5"/><ellipse fill="#000" cx="50" cy="60" rx="8" ry="10"/></svg>',
              ghostColor: color,
            };

            const locationPin = L.divIcon({
              className: 'leaflet-data-marker',
              html: L.Util.template(
                ghostMarkerSettings.mapIconUrl,
                ghostMarkerSettings
              ),
              iconAnchor: [15, 36],
              iconSize: [30, 36],
              popupAnchor: [0, -36],
            });

            // Create marker with popup
            const marker = L.marker([lat, lng]);
            marker.setIcon(locationPin);

            marker.bindPopup(`
              <div style="
                background: #000; 
                color: #00ff00; 
                padding: 12px 16px; 
                border: 1px solid #00ff00; 
                border-radius: 4px; 
                font-family: 'Courier New', monospace; 
                font-size: 16px; 
                line-height: 1.4;
                text-shadow: 0 0 2px #00ff00;
                box-shadow: 0 0 8px rgba(0, 255, 0, 0.3);
                max-width: 180px;
              ">
                <div style="font-weight: bold; margin-bottom: 6px; font-size: 12px;">${nodeData.longName}</div>
                <div style="font-size: 12px;">Join the
                  <a href="/meshtastic" style="
                    color: #00ff00; 
                    text-decoration: none;
                    border-bottom: 1px solid #00ff00;
                    padding-bottom: 1px;
                  ">mesh</a> to chat and CTF with this ghost 👻
                </div>
              </div>
            `);
            liveLayer.addLayer(marker);
          });
        } catch (error) {
          console.error('Error parsing live_nodes JSON:', error);
        }
      }
      
      L.control.layers({}, overlayMaps).addTo(map);
      
      
      // Create live layer and make it visible by default
      // const liveOverlayMap: OverlayMap = {};
      // liveOverlayMap['live'] = liveLayer;
      // L.control.layers({}, liveOverlayMap).addTo(map);
      
      hasMounted.current = true;
    }
  }, [map]);

  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const mapSize = map.getSize();
      const clickPoint = map.latLngToContainerPoint(e.latlng);
      
      if (clickPoint.x > mapSize.x - 50 && clickPoint.y > mapSize.y - 50) {
        setTapCount(prev => prev + 1);
        
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
        }
        
        tapTimeoutRef.current = setTimeout(() => {
          setTapCount(0);
        }, 3000);
        
        if (tapCount >= 14) {
          setShowLiveNodes(prev => !prev);
          setTapCount(0);
          
          const flash = document.createElement('div');
          flash.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #00ff00;
            color: #000;
            padding: 20px;
            font-family: 'Courier New', monospace;
            font-size: 24px;
            font-weight: bold;
            z-index: 9999;
            border: 2px solid #00ff00;
            box-shadow: 0 0 20px #00ff00;
            text-shadow: 0 0 5px #00ff00;
          `;
          flash.textContent = showLiveNodes ? 'GHOST MODE DEACTIVATED' : 'GHOST MODE ACTIVATED';
          document.body.appendChild(flash);
          setTimeout(() => document.body.removeChild(flash), 1500);
        }
      }
    };

    if (map) {
      map.on('click', handleMapClick);
      return () => {
        map.off('click', handleMapClick);
      };
    }
  }, [map, tapCount]);

  return <></>;
};

export default Map;

function drawWayPointRoute(data: any, layer: L.LayerGroup<any>) {
  const gpxString = data.gpx;
  const textcolor = data.color;
  const name = data.name;
  const description = data.description;
  const opacity = data.opacity || 0.8;
  const weight = data.weight || 3;

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxString, 'application/xml');
  const points = xmlDoc.getElementsByTagName('wpt');
  const coordinates: {
    lat: number;
    lon: number;
    wname: string;
    wcmt: string;
    wdesc: string;
  }[] = [];

  // Collect all waypoint coordinates and create markers
  for (let i = 0; i < points.length; i++) {
    const lat = parseFloat(points[i].getAttribute('lat') || '0');
    const lon = parseFloat(points[i].getAttribute('lon') || '0');
    const nameNode = points[i].getElementsByTagName('name')[0];
    const cmtNode = points[i].getElementsByTagName('cmt')[0];
    const descNode = points[i].getElementsByTagName('desc')[0];
    const wname = nameNode ? nameNode.textContent || '' : '';
    const wdesc = descNode ? descNode.textContent || '' : '';
    const wcmt = cmtNode ? cmtNode.textContent || '' : '';

    const iconSettings = {
      mapIconUrl:
        '<svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 149 178"><path fill="{mapIconColor}" stroke="#FFF" stroke-width="6" stroke-miterlimit="10" d="M126 23l-6-6A69 69 0 0 0 74 1a69 69 0 0 0-51 22A70 70 0 0 0 1 74c0 21 7 38 22 52l43 47c6 6 11 6 16 0l48-51c12-13 18-29 18-48 0-20-8-37-22-51z"/><circle fill="{mapIconColorInnerCircle}" cx="74" cy="75" r="61"/><circle fill="{innerCircleColor}" cx="74" cy="75" r="{pinInnerCircleRadius}"/></svg>',
      mapIconColor: textcolor,
      mapIconColorInnerCircle: textcolor,
      innerCircleColor: textcolor.toLowerCase() === '#ffffff' || textcolor.toLowerCase() === 'white' ? '#000' : '#FFF',
      pinInnerCircleRadius: 32,
    };

    const startPin = L.divIcon({
      className: 'leaflet-data-marker',
      html: L.Util.template(iconSettings.mapIconUrl, iconSettings),
      iconAnchor: [12, 32],
      iconSize: [25, 30],
      popupAnchor: [0, -28],
    });
    
    const startMarker = L.marker([lat, lon]);
    startMarker.setIcon(startPin);
    layer.addLayer(startMarker);

    const googleLink = `http://google.com/maps?q=${lat},${lon}`;
    const startupPopup = L.popup({})
      .setLatLng([lat, lon])
      .setContent(
        `<div class='text-lg'>${wname}<br/>${name}</div><div>${wdesc}</div><div><a class="text-xs" href="${googleLink}" rel="noreferrer" target="_blank">Google Map</a></div>`
      );

    startMarker.bindPopup(startupPopup);
    coordinates.push({ lat, lon, wname, wcmt, wdesc });
  }

  // Create connecting polyline between waypoints
  if (coordinates.length > 1) {
    const polylineCoordinates: [number, number][] = coordinates.map(coord => [coord.lat, coord.lon]);
    const polyline = L.polyline(polylineCoordinates, {
      color: textcolor,
      opacity,
      weight,
      lineCap: 'round',
    });
    layer.addLayer(polyline);
  }
}

function drawRoute(data: any, layer: L.LayerGroup<any>) {
  const id = data.id;

  const fullUrl = `${window.location.protocol}//${window.location.host}/${data.gpxurl}`;
  if (data.gpxurl) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', fullUrl, false); // false makes the request synchronous
      xhr.send(null);
      if (xhr.status === 200) {
        data.gpx = xhr.responseText;
      } else {
        throw new Error(
          `Failed to fetch GPX from ${fullUrl}. Status: ${xhr.status}`
        );
      }
    } catch (error) {
      console.error(`Error fetching GPX from ${fullUrl}:`, error);
    }
  }
  const polylineCoordinates: [number, number][] = parseGPX(data.gpx);

  const color = data.color;
  const name = data.name;
  const opacity = data.opacity;
  const weight = data.weight;

  const startLocation = data.startLocation
    ? data.startLocation
    : polylineCoordinates.length > 0
    ? {
        latitude: polylineCoordinates[0][0],
        longitude: polylineCoordinates[0][1],
      }
    : undefined;

  // Check if this GPX contains waypoints
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(data.gpx, 'application/xml');
  const waypoints = xmlDoc.getElementsByTagName('wpt');
  const hasWaypoints = waypoints.length > 0;
  
  // If we have ONLY waypoints (no track/route points), use dedicated waypoint handler
  if (polylineCoordinates.length === 0 && hasWaypoints) {
    drawWayPointRoute(data, layer);
    return; // Exit early for waypoint-only routes
  }
  
  // If we have waypoints along with track/route points, add waypoint pins
  if (hasWaypoints && polylineCoordinates.length > 0) {
    for (let i = 0; i < waypoints.length; i++) {
      const wpt = waypoints[i];
      const lat = parseFloat(wpt.getAttribute('lat') || '0');
      const lon = parseFloat(wpt.getAttribute('lon') || '0');
      const nameNode = wpt.getElementsByTagName('name')[0];
      const wptName = nameNode ? nameNode.textContent || '' : '';
      
      // Create a distinct waypoint marker style
      const wptIconSettings = {
        mapIconUrl:
          '<svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 149 178"><path fill="{mapIconColor}" stroke="#FFF" stroke-width="6" stroke-miterlimit="10" d="M126 23l-6-6A69 69 0 0 0 74 1a69 69 0 0 0-51 22A70 70 0 0 0 1 74c0 21 7 38 22 52l43 47c6 6 11 6 16 0l48-51c12-13 18-29 18-48 0-20-8-37-22-51z"/><circle fill="#FFF" cx="74" cy="75" r="61"/><circle fill="{innerCircleColor}" cx="74" cy="75" r="{pinInnerCircleRadius}"/></svg>',
        mapIconColor: color,
        mapIconColorInnerCircle: color,
        innerCircleColor: color.toLowerCase() === '#ffffff' || color.toLowerCase() === 'white' ? '#000' : color,
        pinInnerCircleRadius: 20,
      };
      
      const wptPin = L.divIcon({
        className: 'leaflet-data-marker',
        html: L.Util.template(wptIconSettings.mapIconUrl, wptIconSettings),
        iconAnchor: [12, 32],
        iconSize: [20, 25],
        popupAnchor: [0, -28],
      });
      
      const wptMarker = L.marker([lat, lon]);
      wptMarker.setIcon(wptPin);
      
      // Create popup with waypoint name
      const wptPopup = L.popup({})
        .setLatLng([lat, lon])
        .setContent(`<div class='text-lg font-bold'>${wptName}</div><div class='text-sm'>${name}</div>`);
      
      wptMarker.bindPopup(wptPopup);
      layer.addLayer(wptMarker);
    }
  }

  // Only create polyline if we have track/route coordinates
  let polyline: L.Polyline | undefined;
  if (polylineCoordinates.length > 0) {
    polyline = L.polyline(polylineCoordinates, {
      color,
      opacity,
      weight,
      lineCap: 'round',
    });
    layer.addLayer(polyline);
  }

  // Add start location marker if we have one (either for routes or standalone pins)
  if (startLocation) {
    // Check if this is a "meet" pin (e.g., "Meet Here Every Day")
    const isMeetHerePin = name.toLowerCase().includes('meet');
    
    // Use DC Jack with white background for meet pins
    const iconSettings = isMeetHerePin ? {
      mapIconUrl:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle fill="#FFF" cx="100" cy="100" r="100"/><path fill="{mapIconColor}" stroke="{strokeColor}" stroke-width="2" d="M200,99.85c.09,55.23-44.64,100.06-99.85,100.15C44.92,200.09.08,155.39,0,100.15-.1,44.92,44.6.07,99.85,0c55.2-.09,100.07,44.61,100.15,99.85ZM100.76,128.94l-15.83-8.93-42.35,21.24c-1.31-4.35-4.96-7.45-9.26-7.45-5.39,0-9.77,4.9-9.77,10.91.01,6.01,4.39,10.88,9.78,10.87.56,0,1.09-.06,1.61-.13l.57,1.11c-1.49,1.89-2.36,4.34-2.36,6.99,0,5.89,4.38,10.65,9.77,10.65,5.4-.01,9.75-4.78,9.73-10.67,0-3.48-1.52-6.56-3.87-8.5l51.98-26.1ZM192.61,89.23c0-6.01-4.4-10.89-9.78-10.87-.86,0-1.68.12-2.46.36,1.87-1.99,3-4.79,3-7.89,0-6.02-4.39-10.87-9.78-10.87-5.39,0-9.76,4.89-9.74,10.9,0,3.06,1.13,5.8,2.94,7.77l-23.18,11.65c2.94-6.07,4.57-12.88,4.55-20.08-.03-25.46-20.71-46.09-46.2-46.05-25.46.04-46.1,20.73-46.04,46.2,0,4.64.69,9.09,1.96,13.31l-18.06-10.18c1.82-1.99,2.95-4.74,2.95-7.77,0-6.05-4.46-10.94-9.95-10.93-5.48,0-9.92,4.9-9.92,10.96,0,2.98,1.12,5.71,2.89,7.68-.68-.18-1.4-.25-2.12-.25-5.47.01-9.93,4.9-9.92,10.95.03,6.04,4.47,10.92,9.96,10.92,4.22,0,7.82-2.92,9.25-7.02l54.39,30.67,15.84,8.93,49.01,27.65c-1.01,1.87-1.61,4.17-1.61,6.65,0,6.23,3.76,11.26,8.37,11.26s8.35-5.05,8.33-11.29c0-3.89-1.48-7.36-3.74-9.36,1.36.84,2.99,1.34,4.69,1.34,5.06,0,9.13-4.3,9.13-9.59,0-5.32-4.1-9.6-9.14-9.6-3.97.01-7.35,2.65-8.6,6.38l-39.2-22.11-6.96-3.93c1.18-.29,2.36-.64,3.54-1.05l6.19,3.51,50.27-25.25c1.15,4.58,4.94,7.93,9.41,7.92,5.41,0,9.76-4.89,9.75-10.9ZM119.63,64.19c5.28,0,9.55-3.98,9.55-8.9-.02-4.9-4.29-8.86-9.58-8.86-5.29,0-9.56,3.98-9.56,8.89.01,4.92,4.3,8.89,9.59,8.87ZM87.68,64.24c5.28,0,9.55-3.99,9.55-8.9-.01-4.9-4.3-8.87-9.56-8.86-5.29,0-9.57,3.99-9.57,8.89,0,4.91,4.3,8.88,9.58,8.87ZM133.23,70.66c-2.61,0-4.73,1.2-4.74,2.67.03,1.15,1.31,2.11,3.07,2.5-1.87,13.84-14.04,24.55-28.79,24.57-14.74.02-26.95-10.64-28.89-24.49,1.81-.38,3.07-1.35,3.07-2.5,0-1.46-2.11-2.66-4.72-2.66-2.6,0-4.69,1.21-4.69,2.68,0,1.07,1.1,1.98,2.71,2.42,1.1,15.62,15.28,27.96,32.61,27.94,17.37-.03,31.52-12.44,32.56-28.09,1.51-.45,2.54-1.35,2.54-2.38,0-1.46-2.13-2.66-4.72-2.66Z"/></svg>',
      mapIconColor: color.toLowerCase() === '#ffffff' || color.toLowerCase() === 'white' ? '#000000' : color,
      strokeColor: color.toLowerCase() === '#ffffff' || color.toLowerCase() === 'white' ? '#FFF' : '#000',
      mapIconColorInnerCircle: color,
      pinInnerCircleRadius: 0,
    } : {
      mapIconUrl:
        '<svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 149 178"><path fill="{mapIconColor}" stroke="#FFF" stroke-width="6" stroke-miterlimit="10" d="M126 23l-6-6A69 69 0 0 0 74 1a69 69 0 0 0-51 22A70 70 0 0 0 1 74c0 21 7 38 22 52l43 47c6 6 11 6 16 0l48-51c12-13 18-29 18-48 0-20-8-37-22-51z"/><circle fill="{mapIconColorInnerCircle}" cx="74" cy="75" r="61"/><circle fill="{innerCircleColor}" cx="74" cy="75" r="{pinInnerCircleRadius}"/></svg>',
      mapIconColor: color,
      mapIconColorInnerCircle: color,
      innerCircleColor: color.toLowerCase() === '#ffffff' || color.toLowerCase() === 'white' ? '#000' : '#FFF',
      pinInnerCircleRadius: 32,
    };
    
    // 1.5x size for "Meet Here Every Day" DC Jack icon
    const iconSize = isMeetHerePin ? [37, 45] : [25, 30];
    const iconAnchor = isMeetHerePin ? [18, 48] : [12, 32];
    const popupAnchor = isMeetHerePin ? [0, -42] : [0, -28];
    
    const startPin = L.divIcon({
      className: 'leaflet-data-marker',
      html: L.Util.template(
        isMeetHerePin ? iconSettings.mapIconUrl : (startLocation.svgPin ?? iconSettings.mapIconUrl),
        iconSettings
      ),
      iconAnchor: iconAnchor as [number, number],
      iconSize: iconSize as [number, number],
      popupAnchor: popupAnchor as [number, number],
    });
    
    const startMarker = L.marker([
      startLocation.latitude,
      startLocation.longitude,
    ], {
      // Set high z-index for "Meet Here Every Day" pin to render on top
      zIndexOffset: isMeetHerePin ? 1000 : 0
    });
    startMarker.setIcon(startPin);

    const description = data.description;

    const linktemplate = `<a href="${data.gpxurl}">GPX</a>&nbsp; | &nbsp;<a target="_blank" rel="noreferrer" href="${data.stravaurl}">Strava</a>`;

    const startupPopup = L.popup({})
      .setLatLng([startLocation.latitude, startLocation.longitude])
      .setContent(
        `<div class='text-lg'>${name}</div><div>${linktemplate}<p>${description}</p></div>`
      );

    startMarker.bindPopup(startupPopup);
    if (polyline) {
      polyline.bindPopup(startupPopup);
    }
    layer.addLayer(startMarker);
  }
}

// const flexPolyline = encode({ polyline: coordinates });
// const d = decode(polystring)
// console.log(JSON.stringify(d));
// const polylineCoordinates: [number, number][] = d.polyline.map((coord: number[]) => [coord[0], coord[1]]);
