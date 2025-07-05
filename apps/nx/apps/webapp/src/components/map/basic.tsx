'use client';

import * as L from 'leaflet';
import { LatLngExpression, LatLngTuple } from 'leaflet';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-gpx';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

interface MapProps {
  center: LatLngExpression | LatLngTuple;
  raw: string;
  live_nodes: string;
  zoom?: number;
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

  const points = trkpts.length ? trkpts : rtept;
  const coordinates: [number, number][] = [];

  for (let i = 0; i < points.length; i++) {
    const lat = parseFloat(points[i].getAttribute('lat') || '0');
    const lon = parseFloat(points[i].getAttribute('lon') || '0');
    coordinates.push([lat, lon]);
  }

  return coordinates;
}

const Map = ({ center: posix, raw, zoom = defaults.zoom }: MapProps) => {
  return (
    <MapContainer
      center={posix}
      zoom={zoom}
      style={{ zIndex: '0', height: '75vh', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* <TileLayer
        url="https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
      /> */}

      <AddGPXLayer raw={raw} />
    </MapContainer>
  );
};

const AddGPXLayer = ({ raw }: { raw: string }) => {
  const hasMounted = useRef(false);
  const map = useMap();
  const routes = JSON.parse(raw);

  useEffect(() => {
    if (hasMounted.current) return;

    if (map) {
      var rawOverlay: RawOverlayMap = {};

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

      L.control.layers({}, overlayMaps).addTo(map);

      hasMounted.current = true;
    }
  }, [map]);

  return <></>;
};

export default Map;

function drawWayPointRoute(data: any, layer: L.LayerGroup<any>) {
  const gpxString = data.gpx;
  const textcolor = data.color;
  const name = data.name;
  const description = data.description;
  const svgPin = data.startLocation?.svgPin;

  if (!data.startLocation) {
    console.log(`No start location.`);
    return;
  }

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
        '<svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 149 178"><path fill="{mapIconColor}" stroke="#FFF" stroke-width="6" stroke-miterlimit="10" d="M126 23l-6-6A69 69 0 0 0 74 1a69 69 0 0 0-51 22A70 70 0 0 0 1 74c0 21 7 38 22 52l43 47c6 6 11 6 16 0l48-51c12-13 18-29 18-48 0-20-8-37-22-51z"/><circle fill="{mapIconColorInnerCircle}" cx="74" cy="75" r="61"/><circle fill="#FFF" cx="74" cy="75" r="{pinInnerCircleRadius}"/></svg>',
      mapIconColor: textcolor,
      mapIconColorInnerCircle: textcolor,
      pinInnerCircleRadius: 32,
    };

    const startPin = L.divIcon({
      className: 'leaflet-data-marker',
      html: L.Util.template(svgPin, iconSettings),
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
    : {
        latitude: polylineCoordinates[0][0],
        longitude: polylineCoordinates[0][1],
      };

  if (polylineCoordinates.length === 0) {
    drawWayPointRoute(data, layer);
  }

  const polyline = L.polyline(polylineCoordinates, {
    color,
    opacity,
    weight,
    lineCap: 'round',
  });
  layer.addLayer(polyline);

  const iconSettings = {
    mapIconUrl:
      '<svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 149 178"><path fill="{mapIconColor}" stroke="#FFF" stroke-width="6" stroke-miterlimit="10" d="M126 23l-6-6A69 69 0 0 0 74 1a69 69 0 0 0-51 22A70 70 0 0 0 1 74c0 21 7 38 22 52l43 47c6 6 11 6 16 0l48-51c12-13 18-29 18-48 0-20-8-37-22-51z"/><circle fill="{mapIconColorInnerCircle}" cx="74" cy="75" r="61"/><circle fill="#FFF" cx="74" cy="75" r="{pinInnerCircleRadius}"/></svg>',
    mapIconColor: color,
    mapIconColorInnerCircle: color,
    pinInnerCircleRadius: 32,
  };

  if (startLocation) {
    const startPin = L.divIcon({
      className: 'leaflet-data-marker',
      html: L.Util.template(
        startLocation.svgPin ?? iconSettings.mapIconUrl,
        iconSettings
      ),
      iconAnchor: [12, 32],
      iconSize: [25, 30],
      popupAnchor: [0, -28],
    });
    const startMarker = L.marker([
      startLocation.latitude,
      startLocation.longitude,
    ]);
    startMarker.setIcon(startPin);

    const description = data.description;

    const linktemplate = `<a href="${data.gpxurl}">GPX</a>&nbsp; | &nbsp;<a target="_blank" rel="noreferrer" href="${data.stravaurl}">Strava</a>`;

    const startupPopup = L.popup({})
      .setLatLng([startLocation.latitude, startLocation.longitude])
      .setContent(
        `<div class='text-lg'>${name}</div><div>${linktemplate}<p>${description}</p></div>`
      );

    startMarker.bindPopup(startupPopup);
    polyline.bindPopup(startupPopup);
    layer.addLayer(startMarker);
  }
}

// const flexPolyline = encode({ polyline: coordinates });
// const d = decode(polystring)
// console.log(JSON.stringify(d));
// const polylineCoordinates: [number, number][] = d.polyline.map((coord: number[]) => [coord[0], coord[1]]);
