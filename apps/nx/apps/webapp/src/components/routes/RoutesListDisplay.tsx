'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Chip,
  Button,
  Link,
  Spinner,
} from '@heroui/react';
import { 
  Route, 
  MapPin, 
  Map, 
  Maximize2, 
  ExternalLink, 
  Download 
} from 'lucide-react';
import PolylineRenderer from './PolylineRenderer';
import EnhancedClientMap from '@components/map/EnhancedClientMap';

type LocationData = {
  text: string;
  lat?: number;
  lng?: number;
} | null;

type RouteData = {
  id: string;
  name: string;
  distance: string;
  distanceRaw?: string;
  distanceUnit?: string;
  description?: string;
  polyline?: string;
  elevationGain?: number;
  difficulty?: string;
  terrain?: string;
  startLocation?: LocationData;
  endLocation?: LocationData;
  stravaUrl?: string;
  gpxUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

interface RoutesListDisplayProps {
  initialRoutes: any;
  mqttNodes: any;
}

export default function RoutesListDisplay({ initialRoutes, mqttNodes }: RoutesListDisplayProps) {
  const { theme, resolvedTheme } = useTheme();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [distanceUnits, setDistanceUnits] = useState<Record<string, 'km' | 'mi' | 'steps'>>({});
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  
  // Map display states
  const [showMap, setShowMap] = useState(true);
  const [mapEnabled, setMapEnabled] = useState(true);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const mapInstanceRef = useRef<any>(null);

  // Convert distance between units
  const convertDistance = (distanceInput: string | number | undefined | null, unit: 'km' | 'mi' | 'steps'): string => {
    // Handle different input types
    let km: number;
    if (typeof distanceInput === 'number') {
      km = distanceInput;
    } else if (typeof distanceInput === 'string') {
      // Remove any existing unit suffixes and parse
      const numStr = distanceInput.replace(/[^\d.-]/g, '');
      km = parseFloat(numStr);
    } else {
      return '0km';
    }
    
    if (isNaN(km)) return '0km';
    
    switch (unit) {
      case 'mi':
        return `${(km * 0.621371).toFixed(1)}mi`;
      case 'steps':
        return `${Math.round(km * 1000)} steps`;
      default:
        return `${km.toFixed(1)}km`;
    }
  };

  // Cycle through distance units
  const cycleDistanceUnit = (routeId: string) => {
    const currentUnit = distanceUnits[routeId] || 'km';
    const nextUnit = currentUnit === 'km' ? 'mi' : currentUnit === 'mi' ? 'steps' : 'km';
    setDistanceUnits(prev => ({ ...prev, [routeId]: nextUnit }));
  };

  // Truncate description to about 10 words
  const truncateDescription = (text: string, maxWords: number = 10): string => {
    if (!text) return '';
    const words = text.split(' ');
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const getDifficultyColor = (difficulty?: string) => {
    if (!difficulty) return 'default';
    const lower = difficulty.toLowerCase();
    if (lower.includes('easy')) return 'success';
    if (lower.includes('moderate') || lower.includes('medium')) return 'warning';
    if (lower.includes('hard') || lower.includes('difficult')) return 'danger';
    return 'default';
  };

  useEffect(() => {
    // Use the initialRoutes data passed from server instead of fetching again
    try {
      const parsedRoutes = JSON.parse(initialRoutes);
      
      // Log to see what we're getting (Strapi v5)
      if (parsedRoutes.length > 0) {
      }
      
      // Transform the Strapi data structure to our component format
      const transformedRoutes = parsedRoutes.map((route: any) => {
        // Safely extract distance with proper formatting (Strapi v5)
        const rawDistance = route.distance;
        let formattedDistance: string;
        
        if (typeof rawDistance === 'number') {
          formattedDistance = `${rawDistance}km`;
        } else if (typeof rawDistance === 'string') {
          // If it already has units, keep as is, otherwise add km
          formattedDistance = rawDistance.includes('km') || rawDistance.includes('mi') || rawDistance.includes('m') 
            ? rawDistance 
            : `${rawDistance}km`;
        } else {
          formattedDistance = '0km';
        }

        // Try to find polyline data (Strapi v5 - no attributes)
        const polylineData = route.polyline || 
                            route.Polyline ||
                            route.gpx_polyline ||
                            null;
        
        // Try to find GPX URL (Strapi v5 - no attributes)
        const gpxUrlData = route.gpxurl || 
                          route.gpxUrl || 
                          route.gpx || 
                          route.gpx_url ||
                          route.GPX ||
                          null;
                          

        return {
          id: route.id.toString(),
          name: route.name || 'Unnamed Route',
          distance: formattedDistance,
          description: route.description,
          polyline: polylineData,
          elevationGain: route.elevationGain,
          difficulty: route.difficulty,
          terrain: route.terrain,
          startLocation: route.startLocation,
          endLocation: route.endLocation,
          stravaUrl: route.stravaUrl || route.stravaurl,
          gpxurl: gpxUrlData,
          createdAt: route.createdAt,
          updatedAt: route.updatedAt,
        };
      });
      setRoutes(transformedRoutes);
    } catch (err) {
      console.error('Error parsing initial routes:', err);
      setError('Failed to load routes');
    } finally {
      setLoading(false);
    }
  }, [initialRoutes]);

  const toggleRow = (routeId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(routeId)) {
        newSet.delete(routeId);
      } else {
        newSet.add(routeId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex justify-between items-center pb-2">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">DEFCON Routes</h3>
                <div className="w-8 h-4 bg-default-200 rounded animate-pulse"></div>
              </div>
              <p className="text-sm text-default-500">Loading routes...</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              size="lg"
              variant="flat"
              color="primary"
              isIconOnly
              disabled
            >
              <Map className="w-6 h-6" />
            </Button>
            <Button
              size="lg"
              variant="flat"
              color="secondary"
              isIconOnly
              disabled
            >
              <Maximize2 className="w-6 h-6" />
            </Button>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="gap-4 relative p-0">
          {/* Map loading placeholder */}
          <div className="h-64 px-4 pt-4">
            <div className="h-full rounded-lg bg-default-100 flex flex-col items-center justify-center gap-2">
              <Spinner size="sm" color="primary" />
              <div className="text-default-400 text-xs">Loading map...</div>
            </div>
          </div>
          
          {/* Route list loading skeletons */}
          <div className="w-full">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b border-divider last:border-b-0">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4 flex-grow">
                    <div className="w-8 h-8 rounded-full bg-default-200 animate-pulse"></div>
                    <div className="w-20 h-15 rounded bg-default-200 animate-pulse"></div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-4 bg-default-200 rounded animate-pulse"></div>
                        <div className="w-16 h-4 bg-default-200 rounded animate-pulse"></div>
                      </div>
                      <div className="w-48 h-3 bg-default-100 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className="flex gap-3">
          <Route className="w-6 h-6" />
          <div className="flex flex-col">
            <p className="text-lg font-bold">DEFCON Routes</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <p className="text-red-500">{error}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full animate-in fade-in-0 duration-300">
      <CardHeader 
        className="flex justify-between items-center pb-2"
      >
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">DEFCON Routes</h3>
              <Chip size="sm" variant="flat" color="primary">
                {routes.length}
              </Chip>
            </div>
            <p className="text-sm text-default-500">
              Available running and walking routes
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            size="lg"
            variant={mapEnabled ? "solid" : "flat"}
            color="primary"
            isIconOnly
            onPress={() => {
              if (mapEnabled) {
                setMapEnabled(false);
                setShowMap(false);
              } else {
                setMapEnabled(true);
                setShowMap(true);
              }
            }}
            aria-label={mapEnabled ? 'Disable Map' : 'Enable Map'}
          >
            <Map className="w-6 h-6" />
          </Button>
          <Button
            size="lg"
            variant={isMapExpanded ? "solid" : "flat"}
            color="secondary"
            isIconOnly
            isDisabled={!mapEnabled}
            aria-label={isMapExpanded ? 'Shrink Map' : 'Expand Map'}
            onPress={() => {
              setIsMapExpanded(!isMapExpanded);
              // Force map to recalculate size after transition
              setTimeout(() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.invalidateSize();
                }
              }, 350);
            }}
          >
            <Maximize2 className="w-6 h-6" />
          </Button>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="gap-4 relative p-0">
          {showMap && mapEnabled && (
            <div className={`${isMapExpanded ? 'h-[32rem]' : 'h-64'} transition-all duration-300 px-4 pt-4`}>
              <div className="h-full rounded-lg overflow-hidden">
                <EnhancedClientMap 
                  raw={initialRoutes} 
                  mqtt_nodes={mqttNodes} 
                  center={[36.1320813, -115.1667648]}
                  loadingText="Loading map..."
                  loadingIndicator=""
                  disableGhostMode={false}
                  disablePopups={false}
                  themeOverride={resolvedTheme || 'light'}
                  onMapReady={(mapInstance) => {
                    mapInstanceRef.current = mapInstance;
                  }}
                />
              </div>
            </div>
          )}

          <div className="w-full">
            {routes.map((route, index) => (
              <div key={route.id} className="border-b border-divider last:border-b-0">
                <div
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-default-50 transition-colors ${
                    selectedRoute?.id === route.id ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => {
                    const wasSelected = selectedRoute?.id === route.id;
                    setSelectedRoute(wasSelected ? null : route);
                    toggleRow(route.id);
                    
                    if (!wasSelected && mapEnabled) {
                      setShowMap(true);
                    }
                  }}
                >
                  <div className="flex items-center gap-4 flex-grow">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm border border-primary/30">
                      {index + 1}
                    </div>
                    
                    {/* Mini polyline preview */}
                    <div className="flex-shrink-0 flex justify-start">
                      {(route.polyline || route.gpxUrl) ? (
                        <div className="border border-default-200 rounded">
                          <PolylineRenderer
                            polyline={route.polyline}
                            gpxUrl={route.gpxUrl}
                            width={80}
                            height={60}
                            strokeColor="#3B82F6"
                            strokeWidth={2}
                            padding={5}
                            showMapTile={true}
                            theme={resolvedTheme || 'light'}
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-15 border border-dashed border-default-300 rounded flex items-center justify-center">
                          <span className="text-xs text-default-400">No map</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">
                          {route.name}
                        </span>
                        <Chip 
                          size="sm" 
                          variant="flat" 
                          color="primary"
                          className="cursor-pointer hover:bg-primary-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            cycleDistanceUnit(route.id);
                          }}
                        >
                          {convertDistance(route.distance, distanceUnits[route.id] || 'km')}
                        </Chip>
                        {route.difficulty && (
                          <Chip 
                            size="sm" 
                            variant="flat" 
                            color={getDifficultyColor(route.difficulty)}
                          >
                            {route.difficulty}
                          </Chip>
                        )}
                      </div>
                      {route.description && (
                        <p className="text-sm text-default-500">
                          {truncateDescription(route.description, 10)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`transition-transform ${expandedRows.has(route.id) ? 'rotate-180' : ''}`}>
                      ▼
                    </div>
                  </div>
                </div>
                
                {expandedRows.has(route.id) && (
                  <div className="px-4 pb-4 bg-default-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Route Details */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-default-700">Route Details</h4>
                        
                        <div className="space-y-2 text-sm">
                          {route.distance && (
                            <div className="flex justify-between">
                              <span className="text-default-500">Distance:</span>
                              <span 
                                className="font-medium cursor-pointer hover:text-primary-500"
                                onClick={() => cycleDistanceUnit(route.id)}
                              >
                                {convertDistance(route.distance, distanceUnits[route.id] || 'km')}
                              </span>
                            </div>
                          )}
                          
                          {route.elevationGain && (
                            <div className="flex justify-between">
                              <span className="text-default-500">Elevation Gain:</span>
                              <span className="font-medium">{route.elevationGain}m</span>
                            </div>
                          )}
                          
                          {route.terrain && (
                            <div className="flex justify-between">
                              <span className="text-default-500">Terrain:</span>
                              <span className="font-medium">{route.terrain}</span>
                            </div>
                          )}
                          
                          {route.startLocation && route.startLocation.lat && route.startLocation.lng && (
                            <div className="flex justify-between">
                              <span className="text-default-500">Start:</span>
                              <Link
                                href={`https://www.openstreetmap.org/?mlat=${route.startLocation.lat}&mlon=${route.startLocation.lng}&zoom=15`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-500 font-medium hover:underline"
                              >
                                <MapPin className="w-3 h-3 inline mr-1" />
                                View on Map
                              </Link>
                            </div>
                          )}
                          
                          {route.endLocation && route.endLocation.lat && route.endLocation.lng && (
                            <div className="flex justify-between">
                              <span className="text-default-500">End:</span>
                              <Link
                                href={`https://www.openstreetmap.org/?mlat=${route.endLocation.lat}&mlon=${route.endLocation.lng}&zoom=15`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-500 font-medium hover:underline"
                              >
                                <MapPin className="w-3 h-3 inline mr-1" />
                                View on Map
                              </Link>
                            </div>
                          )}
                        </div>
                        
                        {route.description && (
                          <div className="mt-3">
                            <h4 className="font-semibold text-sm text-default-700 mb-1">Description</h4>
                            <p className="text-sm text-default-600">
                              {route.description}
                            </p>
                          </div>
                        )}

                        {/* External Links */}
                        {(route.stravaUrl || route.gpxUrl) && (
                          <div className="mt-4">
                            <h4 className="font-semibold text-sm text-default-700 mb-2">External Links</h4>
                            <div className="flex gap-2">
                              {route.stravaUrl && (
                                <Button
                                  as={Link}
                                  href={route.stravaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  size="sm"
                                  color="success"
                                  variant="flat"
                                  startContent={<ExternalLink className="w-3 h-3" />}
                                >
                                  Strava
                                </Button>
                              )}
                              {route.gpxUrl && (
                                <Button
                                  as={Link}
                                  href={route.gpxUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  size="sm"
                                  color="success"
                                  variant="flat"
                                  startContent={<Download className="w-3 h-3" />}
                                >
                                  Download GPX
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Polyline Map */}
                      {(route.polyline || route.gpxUrl) && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-default-700">Route Map</h4>
                          <PolylineRenderer
                            polyline={route.polyline}
                            gpxUrl={route.gpxUrl}
                            width={300}
                            height={200}
                            strokeColor="#3B82F6"
                            strokeWidth={2}
                            showMapTile={true}
                            theme={resolvedTheme || 'light'}
                          />
                          <p className="text-lg font-medium text-default-600">
                            🟢 Start • 🔴 Finish
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardBody>
    </Card>
  );
}