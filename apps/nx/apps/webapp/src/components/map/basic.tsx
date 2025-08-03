'use client';

import * as L from 'leaflet';
import { LatLngExpression, LatLngTuple } from 'leaflet';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-gpx';
import 'leaflet-polylinedecorator';
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
  externalGhostState?: boolean;
  disablePopups?: boolean; // Disable route popups (for heat map)
}

const defaults = {
  zoom: 13,
};

// Helper function to create expandable popup content
function createExpandablePopup(content: string, maxChars: number = 100): HTMLElement {
  const container = document.createElement('div');
  const isMobile = window.innerWidth < 640;
  
  // Strip HTML tags for length calculation
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  const textContent = tempDiv.textContent || tempDiv.innerText || '';
  
  if (textContent.length <= maxChars) {
    container.innerHTML = content;
    return container;
  }
  
  // Create wrapper to maintain structure
  const wrapper = document.createElement('span');
  wrapper.style.display = 'inline';
  
  const contentSpan = document.createElement('span');
  contentSpan.className = 'popup-content';
  contentSpan.style.display = 'inline';
  
  const button = document.createElement('button');
  button.className = 'expand-btn';
  button.style.cssText = `
    background: none;
    border: none;
    color: #0066cc;
    cursor: pointer;
    text-decoration: underline;
    padding: 0 0 0 4px;
    margin: 0;
    font-size: ${isMobile ? '12px' : '14px'};
    display: inline;
  `;
  
  let isExpanded = false;
  
  const updateContent = () => {
    if (isExpanded) {
      // Show full content - strip block-level tags to keep inline
      let inlineContent = content;
      // Replace p tags with just their content
      inlineContent = inlineContent.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, ' ');
      // Replace other block elements with spaces
      inlineContent = inlineContent.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, ' ');
      // Clean up extra spaces
      inlineContent = inlineContent.replace(/\s+/g, ' ').trim();
      
      contentSpan.innerHTML = inlineContent;
      button.textContent = ' [Less]';
    } else {
      // Show truncated content
      const truncated = textContent.substring(0, maxChars);
      contentSpan.textContent = truncated + '...';
      button.textContent = '[More...]';
    }
  };
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isExpanded = !isExpanded;
    updateContent();
  });
  
  // Initial state
  updateContent();
  
  wrapper.appendChild(contentSpan);
  wrapper.appendChild(button);
  container.appendChild(wrapper);
  
  return container;
}

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

const Map = ({ center: posix, raw, zoom = defaults.zoom, live_nodes, theme, externalGhostState, disablePopups }: MapProps) => {
  return (
    <MapContainer
      center={posix}
      zoom={zoom}
      style={{ zIndex: '0', height: '100%', width: '100%' }}
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

      <AddGPXLayer raw={raw} live_nodes={live_nodes} externalGhostState={externalGhostState} disablePopups={disablePopups} />
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

const AddGPXLayer = ({ raw, live_nodes, externalGhostState, disablePopups }: { raw: string, live_nodes: string, externalGhostState?: boolean, disablePopups?: boolean }) => {
  const hasMounted = useRef(false);
  const map = useMap();
  const routes = JSON.parse(raw);
  const liveLayerRef = useRef<L.LayerGroup | null>(null);
  const [showLiveNodes, setShowLiveNodes] = useState(false);
  const keySequence = useRef<string[]>([]);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const SPECIAL_SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  
  // Use external ghost state if provided, otherwise use internal state
  const isExternalControlled = externalGhostState !== undefined;
  const effectiveShowLiveNodes = isExternalControlled ? externalGhostState : showLiveNodes;

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
        // Only allow internal konami code if not externally controlled
        if (!isExternalControlled) {
          const newState = !showLiveNodes;
          setShowLiveNodes(newState);
        }
        keySequence.current = [];
        
        // Only show flash if not externally controlled
        if (!isExternalControlled) {
          const newState = !showLiveNodes;
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
      if (effectiveShowLiveNodes) {
        map.addLayer(liveLayerRef.current);
      } else {
        map.removeLayer(liveLayerRef.current);
      }
    }
  }, [effectiveShowLiveNodes, map]);

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
          
          // Always add routes to all layer groups they belong to
          const mainLayer = rawOverlay[layerTitle].layer;
          drawRoute(route, mainLayer, disablePopups);
          
          // Only add visible layers to the map initially
          if (visible && !map.hasLayer(mainLayer)) {
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
          drawRoute(route, rawOverlay[route.name].layer, disablePopups);
        }
      });

      const overlayMaps: OverlayMap = Object.entries(rawOverlay)
        .sort(([keyA, a], [keyB, b]) => {
          // Priority order: "Meet Here" first, then "ALL", then everything else by sortKey
          const isMeetHereA = keyA.toLowerCase().includes('here');
          const isMeetHereB = keyB.toLowerCase().includes('here');
          const isAllA = keyA.toLowerCase().includes('all');
          const isAllB = keyB.toLowerCase().includes('all');
          
          // Meet Here layers go first
          if (isMeetHereA && !isMeetHereB) return -1;
          if (!isMeetHereA && isMeetHereB) return 1;
          
          // If both are Meet Here, sort by sortKey
          if (isMeetHereA && isMeetHereB) {
            return a.sortKey.localeCompare(b.sortKey);
          }
          
          // ALL layer goes second (after Meet Here)
          if (isAllA && !isAllB) return -1;
          if (!isAllA && isAllB) return 1;
          
          // Everything else sorted by sortKey
          return a.sortKey.localeCompare(b.sortKey);
        })
        .reduce((acc, [key, value]) => {
          // Include all layers in the control, regardless of initial visibility
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
            // Filter: only show nodes with 'ghost' or 'contest' in longName
            const longName = (nodeData.longName || '').toLowerCase();
            if (!longName.includes('ghost') && !longName.includes('contest') && !longName.includes('operative')) {
              return; // Skip this node
            }

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

            // Create popup with responsive width
            const isMobile = window.innerWidth < 640;
            const popupContent = document.createElement('div');
            popupContent.innerHTML = `
              <div style="
                background: #000; 
                color: #00ff00; 
                padding: 12px 16px; 
                border: 1px solid #00ff00; 
                border-radius: 4px; 
                font-family: 'Courier New', monospace; 
                font-size: ${isMobile ? '14px' : '16px'}; 
                line-height: 1.4;
                text-shadow: 0 0 2px #00ff00;
                box-shadow: 0 0 8px rgba(0, 255, 0, 0.3);
                max-width: ${isMobile ? '250px' : '300px'};
                min-width: ${isMobile ? '200px' : '250px'};
              ">
                <div style="font-weight: bold; margin-bottom: 6px; font-size: ${isMobile ? '12px' : '14px'};">${nodeData.longName}</div>
                <div style="font-size: ${isMobile ? '12px' : '14px'};">Join the
                  <a href="/meshtastic" style="
                    color: #00ff00; 
                    text-decoration: none;
                    border-bottom: 1px solid #00ff00;
                    padding-bottom: 1px;
                  ">mesh</a> to chat and CTF with this ghost 👻
                </div>
              </div>
            `;
            
            marker.bindPopup(popupContent, {
              maxWidth: isMobile ? 250 : 300,
              minWidth: isMobile ? 200 : 250,
              className: 'mobile-friendly-popup'
            });
            liveLayer.addLayer(marker);
          });
        } catch (error) {
          console.error('Error parsing live_nodes JSON:', error);
        }
      }
      
      const layerControl = L.control.layers({}, overlayMaps).addTo(map);
      
      // Add mutual exclusion logic between "ALL" and individual DC layers
      console.log('Setting up layer control events, available layers:', Object.keys(overlayMaps));
      let isUpdatingLayers = false; // Prevent recursive updates
      
      // Intercept checkbox clicks BEFORE Leaflet processes them
      setTimeout(() => {
        const layerControlElement = document.querySelector('.leaflet-control-layers');
        if (layerControlElement) {
          const checkboxes = layerControlElement.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach((checkbox: any) => {
            checkbox.addEventListener('click', function(e: any) {
              if (isUpdatingLayers) return;
              
              // Get the label for this checkbox
              let label = '';
              if (checkbox.nextSibling?.textContent) {
                label = checkbox.nextSibling.textContent.trim();
              } else if (checkbox.parentNode?.textContent) {
                label = checkbox.parentNode.textContent.trim();
              }
              
              console.log(`Checkbox clicked: ${label}, will be checked: ${!checkbox.checked}`);
              
              if (label === 'ALL' && !checkbox.checked) {
                // ALL is being checked - uncheck all DC layers
                console.log('ALL being checked, will hide all DC layers');
                setTimeout(() => {
                  Object.keys(overlayMaps).forEach(name => {
                    if (name.startsWith('DC') && map.hasLayer(overlayMaps[name])) {
                      map.removeLayer(overlayMaps[name]);
                    }
                  });
                }, 10);
              } else if (label.startsWith('DC') && !checkbox.checked) {
                // DC layer is being checked - uncheck ALL
                console.log(`${label} being checked, will hide ALL`);
                setTimeout(() => {
                  if (map.hasLayer(overlayMaps['ALL'])) {
                    map.removeLayer(overlayMaps['ALL']);
                  }
                }, 10);
              }
            });
          });
        }
      }, 100);
      
      map.on('overlayadd', function(e: any) {
        if (isUpdatingLayers) return; // Skip if we're in the middle of updating
        
        console.log('Layer added:', e.name);
        const layerName = e.name;
        
        isUpdatingLayers = true;
        
        if (layerName === 'ALL') {
          // When ALL is checked, hide all DC layers by removing them
          console.log('ALL layer checked, hiding DC layers...');
          Object.keys(overlayMaps).forEach(name => {
            if (name.startsWith('DC') && map.hasLayer(overlayMaps[name])) {
              console.log('Hiding layer:', name);
              map.removeLayer(overlayMaps[name]);
            }
          });
        } else if (layerName.startsWith('DC')) {
          // When any DC layer is checked, hide ALL layer (but leave other DC layers alone)
          console.log('DC layer checked:', layerName, ', hiding ALL layer only...');
          
          // Hide ALL layer by removing it from map
          if (map.hasLayer(overlayMaps['ALL'])) {
            console.log('Hiding ALL layer');
            map.removeLayer(overlayMaps['ALL']);
          }
        }
        
        // Force update of layer control checkboxes more aggressively
        setTimeout(() => {
          const layerControlElement = document.querySelector('.leaflet-control-layers');
          if (layerControlElement) {
            const checkboxes = layerControlElement.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach((checkbox: any) => {
              // Try multiple ways to get the label
              let label = '';
              if (checkbox.nextSibling?.textContent) {
                label = checkbox.nextSibling.textContent.trim();
              } else if (checkbox.parentNode?.textContent) {
                label = checkbox.parentNode.textContent.trim();
              }
              
              console.log(`Found checkbox with label: "${label}"`);
              
              if (label && overlayMaps[label]) {
                const shouldBeChecked = map.hasLayer(overlayMaps[label]);
                console.log(`${label}: checkbox.checked=${checkbox.checked}, shouldBeChecked=${shouldBeChecked}, hasLayer=${map.hasLayer(overlayMaps[label])}`);
                
                if (checkbox.checked !== shouldBeChecked) {
                  console.log(`FORCE updating checkbox for ${label}: ${checkbox.checked} -> ${shouldBeChecked}`);
                  checkbox.checked = shouldBeChecked;
                  
                  // Force a visual update
                  if (shouldBeChecked) {
                    checkbox.setAttribute('checked', 'checked');
                  } else {
                    checkbox.removeAttribute('checked');
                  }
                } else {
                  console.log(`${label}: no update needed (already correct)`);
                }
              }
            });
          }
          isUpdatingLayers = false; // Re-enable after update
        }, 100); // Even longer delay
      });
      
      map.on('overlayremove', function(e: any) {
        if (isUpdatingLayers) return; // Skip if we're in the middle of updating
        
        console.log('Layer removed:', e.name);
        const layerName = e.name;
        
        isUpdatingLayers = true;
        
        if (layerName === 'ALL') {
          console.log('ALL layer unchecked');
          // When ALL is unchecked, don't auto-check anything
          // User can manually check individual DC layers
        } else if (layerName.startsWith('DC')) {
          console.log('DC layer unchecked:', layerName);
          // Check if no DC layers are visible
          const anyDCVisible = Object.keys(overlayMaps).some(name => 
            name.startsWith('DC') && map.hasLayer(overlayMaps[name])
          );
          
          console.log('Any DC layers still visible?', anyDCVisible);
          
          // If no DC layers are visible and ALL is not visible, auto-check ALL
          if (!anyDCVisible && !map.hasLayer(overlayMaps['ALL'])) {
            console.log('Auto-checking ALL layer');
            map.addLayer(overlayMaps['ALL']);
          }
        }
        
        // Force update of layer control checkboxes more aggressively  
        setTimeout(() => {
          const layerControlElement = document.querySelector('.leaflet-control-layers');
          if (layerControlElement) {
            const checkboxes = layerControlElement.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach((checkbox: any) => {
              const label = checkbox.parentNode?.textContent?.trim() || checkbox.nextSibling?.textContent?.trim();
              if (label && overlayMaps[label]) {
                const shouldBeChecked = map.hasLayer(overlayMaps[label]);
                if (checkbox.checked !== shouldBeChecked) {
                  console.log(`Updating checkbox for ${label}: ${checkbox.checked} -> ${shouldBeChecked}`);
                  checkbox.checked = shouldBeChecked;
                  // Trigger change event to make sure Leaflet knows
                  checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
            });
          }
          isUpdatingLayers = false; // Re-enable after update
        }, 50); // Increased delay
      });
      
      
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
    if (!data.hideMarkers) {
      layer.addLayer(startMarker);
    }

    const googleLink = `http://google.com/maps?q=${lat},${lon}`;
    const isMobile = window.innerWidth < 640;
    
    // Create popup content
    const popupContainer = document.createElement('div');
    popupContainer.style.cssText = `
      max-width: ${isMobile ? '250px' : '350px'};
      min-width: ${isMobile ? '200px' : '250px'};
    `;
    
    // Build the content
    const titleContent = `<div class='text-lg font-bold'>${wname}</div><div class='text-base'>${name}</div>`;
    const descContent = wdesc ? `<div class='text-sm mt-2'>${wdesc}</div>` : '';
    const linkContent = `<div class='mt-2'><a class="text-xs text-blue-500" href="${googleLink}" rel="noreferrer" target="_blank">Open in Google Maps</a></div>`;
    
    // Check if we need expandable content
    const fullHtml = titleContent + descContent + linkContent;
    if (wdesc && wdesc.length > 80) {
      popupContainer.innerHTML = titleContent;
      const expandableDesc = createExpandablePopup(descContent, 80);
      popupContainer.appendChild(expandableDesc);
      popupContainer.innerHTML += linkContent;
    } else {
      popupContainer.innerHTML = fullHtml;
    }
    
    startMarker.bindPopup(popupContainer, {
      maxWidth: isMobile ? 250 : 350,
      minWidth: isMobile ? 200 : 250
    });
    coordinates.push({ lat, lon, wname, wcmt, wdesc });
  }

  // Create connecting polyline between waypoints
  if (coordinates.length > 1) {
    const polylineCoordinates: [number, number][] = coordinates.map(coord => [coord.lat, coord.lon]);
    const polyline = L.polyline(polylineCoordinates, {
      color: textcolor,
      opacity,
      weight,
      lineCap: data.lineCap || 'round',
      lineJoin: data.lineJoin || 'round',
    });
    layer.addLayer(polyline);
    
    // Add arrow decorations to show direction for waypoint routes (skip for heat maps)
    if (!data.hideArrows) {
      const decorator = (L as any).polylineDecorator(polyline, {
      patterns: [
        {
          offset: '5%',
          repeat: 75,
          symbol: (L as any).Symbol.arrowHead({
            pixelSize: 16,
            polygon: false,
            pathOptions: {
              stroke: true,
              color: textcolor,
              weight: 3,
              opacity: opacity
            }
          })
        }
      ]
    });
    layer.addLayer(decorator);
    }
  }
}

function drawRoute(data: any, layer: L.LayerGroup<any>, disablePopups = false) {
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

  const endLocation = data.endLocation
    ? data.endLocation
    : polylineCoordinates.length > 0
    ? {
        latitude: polylineCoordinates[polylineCoordinates.length - 1][0],
        longitude: polylineCoordinates[polylineCoordinates.length - 1][1],
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
      const cmtNode = wpt.getElementsByTagName('cmt')[0];
      const wptName = nameNode ? nameNode.textContent || '' : '';
      const wptCmt = cmtNode ? cmtNode.textContent || '' : '';
      
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
      
      // Create popup with waypoint name, route name, and comment
      const isMobile = window.innerWidth < 640;
      const popupContainer = document.createElement('div');
      popupContainer.style.cssText = `
        max-width: ${isMobile ? '220px' : '300px'};
        min-width: ${isMobile ? '150px' : '200px'};
      `;
      
      // Build the content
      const titleContent = `<div class='text-lg font-bold'>${wptName}</div>`;
      const commentContent = wptCmt ? `<div class='text-sm mt-2'>${wptCmt}</div>` : '';
      const routeContent = `<div class='text-base mt-2'>${name}</div>`;
      
      // Check if we need expandable content
      if (wptCmt && wptCmt.length > 80) {
        popupContainer.innerHTML = titleContent;
        const expandableComment = createExpandablePopup(commentContent, 80);
        popupContainer.appendChild(expandableComment);
        popupContainer.innerHTML += routeContent;
      } else {
        popupContainer.innerHTML = titleContent + commentContent + routeContent;
      }
      
      wptMarker.bindPopup(popupContainer, {
        maxWidth: isMobile ? 220 : 300,
        minWidth: isMobile ? 150 : 200
      });
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
      lineCap: data.lineCap || 'round',
      lineJoin: data.lineJoin || 'round',
    });
    layer.addLayer(polyline);
    
    // Add arrow decorations to show direction (skip for heat maps)
    if (!data.hideArrows) {
      const decorator = (L as any).polylineDecorator(polyline, {
      patterns: [
        {
          offset: '5%',
          repeat: 75,
          symbol: (L as any).Symbol.arrowHead({
            pixelSize: 16,
            polygon: false,
            pathOptions: {
              stroke: true,
              color: color,
              weight: 3,
              opacity: opacity
            }
          })
        }
      ]
    });
    layer.addLayer(decorator);
    }
  }

  // Add start location marker if we have one (either for routes or standalone pins)
  if (startLocation) {
    // Check if this is a "meet" pin (e.g., "Meet Here Every Day")
    const isMeetHerePin = name.toLowerCase().includes('here');
    
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

    const isMobile = window.innerWidth < 640;
    
    // Create main popup container
    const mainPopupContainer = document.createElement('div');
    mainPopupContainer.style.cssText = `
      max-width: ${isMobile ? '250px' : '350px'};
      min-width: ${isMobile ? '200px' : '300px'};
    `;
    
    // Add title with "Start:" prefix
    const titleDiv = document.createElement('div');
    titleDiv.className = 'text-lg font-bold mb-2';
    titleDiv.textContent = `Start: ${name}`;
    mainPopupContainer.appendChild(titleDiv);
    
    // Add links
    const linksDiv = document.createElement('div');
    linksDiv.className = 'text-sm mb-2';
    linksDiv.innerHTML = linktemplate;
    mainPopupContainer.appendChild(linksDiv);
    
    // Add description with expandable content if needed
    if (description && description.length > 100) {
      const descContainer = createExpandablePopup(`<p class="text-sm">${description}</p>`, 100);
      mainPopupContainer.appendChild(descContainer);
    } else if (description) {
      const descDiv = document.createElement('p');
      descDiv.className = 'text-sm';
      descDiv.innerHTML = description;
      mainPopupContainer.appendChild(descDiv);
    }
    
    startMarker.bindPopup(mainPopupContainer, {
      maxWidth: isMobile ? 250 : 350,
      minWidth: isMobile ? 200 : 300
    });
    
    // Create separate popup for route polyline with "Route:" prefix
    if (polyline) {
      const routePopupContainer = document.createElement('div');
      routePopupContainer.style.cssText = `
        max-width: ${isMobile ? '250px' : '350px'};
        min-width: ${isMobile ? '200px' : '300px'};
      `;
      
      // Add title
      const routeTitleDiv = document.createElement('div');
      routeTitleDiv.className = 'text-lg font-bold mb-2';
      routeTitleDiv.textContent = name;
      routePopupContainer.appendChild(routeTitleDiv);
      
      // Add links
      const routeLinksDiv = document.createElement('div');
      routeLinksDiv.className = 'text-sm mb-2';
      routeLinksDiv.innerHTML = linktemplate;
      routePopupContainer.appendChild(routeLinksDiv);
      
      // Add description with expandable content if needed
      if (description && description.length > 100) {
        const descContainer = createExpandablePopup(`<p class="text-sm">${description}</p>`, 100);
        routePopupContainer.appendChild(descContainer);
      } else if (description) {
        const descDiv = document.createElement('p');
        descDiv.className = 'text-sm';
        descDiv.innerHTML = description;
        routePopupContainer.appendChild(descDiv);
      }
      
      // Only bind popup if not disabled (heat map disables popups)
      if (!disablePopups) {
        polyline.bindPopup(routePopupContainer, {
          maxWidth: isMobile ? 250 : 350,
          minWidth: isMobile ? 200 : 300
        });
      }
    }
    if (!data.hideMarkers) {
      layer.addLayer(startMarker);
    }
  }

  // Add end location marker if we have one (similar to start location logic)
  if (endLocation) {
    // Use the same classic drop pin style as start pin
    const endIconSettings = {
      mapIconUrl:
        '<svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 149 178"><path fill="{mapIconColor}" stroke="#FFF" stroke-width="6" stroke-miterlimit="10" d="M126 23l-6-6A69 69 0 0 0 74 1a69 69 0 0 0-51 22A70 70 0 0 0 1 74c0 21 7 38 22 52l43 47c6 6 11 6 16 0l48-51c12-13 18-29 18-48 0-20-8-37-22-51z"/><circle fill="{mapIconColorInnerCircle}" cx="74" cy="75" r="61"/><circle fill="{innerCircleColor}" cx="74" cy="75" r="{pinInnerCircleRadius}"/></svg>',
      mapIconColor: color,
      mapIconColorInnerCircle: color,
      innerCircleColor: color.toLowerCase() === '#ffffff' || color.toLowerCase() === 'white' ? '#000' : '#FFF',
      pinInnerCircleRadius: 32,
    };
    
    const endPin = L.divIcon({
      className: 'leaflet-data-marker',
      html: L.Util.template(
        endLocation.svgPin ?? endIconSettings.mapIconUrl,
        endIconSettings
      ),
      iconAnchor: [12, 32] as [number, number],
      iconSize: [25, 30] as [number, number],
      popupAnchor: [0, -28] as [number, number],
    });
    
    const endMarker = L.marker([
      endLocation.latitude,
      endLocation.longitude,
    ], {
      zIndexOffset: 0
    });
    endMarker.setIcon(endPin);

    const description = data.description;
    const linktemplate = `<a href="${data.gpxurl}">GPX</a>&nbsp; | &nbsp;<a target="_blank" rel="noreferrer" href="${data.stravaurl}">Strava</a>`;
    const isMobile = window.innerWidth < 640;
    
    // Create finish popup container
    const finishPopupContainer = document.createElement('div');
    finishPopupContainer.style.cssText = `
      max-width: ${isMobile ? '250px' : '350px'};
      min-width: ${isMobile ? '200px' : '300px'};
    `;
    
    // Add title with "End" prefix
    const finishTitleDiv = document.createElement('div');
    finishTitleDiv.className = 'text-lg font-bold mb-2';
    finishTitleDiv.textContent = `End: ${name}`;
    finishPopupContainer.appendChild(finishTitleDiv);
    
    // Add links
    const finishLinksDiv = document.createElement('div');
    finishLinksDiv.className = 'text-sm mb-2';
    finishLinksDiv.innerHTML = linktemplate;
    finishPopupContainer.appendChild(finishLinksDiv);
    
    // Add description with expandable content if needed
    if (description && description.length > 100) {
      const descContainer = createExpandablePopup(`<p class="text-sm">${description}</p>`, 100);
      finishPopupContainer.appendChild(descContainer);
    } else if (description) {
      const descDiv = document.createElement('p');
      descDiv.className = 'text-sm';
      descDiv.innerHTML = description;
      finishPopupContainer.appendChild(descDiv);
    }
    
    endMarker.bindPopup(finishPopupContainer, {
      maxWidth: isMobile ? 250 : 350,
      minWidth: isMobile ? 200 : 300
    });
    
    if (!data.hideMarkers) {
      layer.addLayer(endMarker);
    }
  }
}

// const flexPolyline = encode({ polyline: coordinates });
// const d = decode(polystring)
// console.log(JSON.stringify(d));
// const polylineCoordinates: [number, number][] = d.polyline.map((coord: number[]) => [coord[0], coord[1]]);
