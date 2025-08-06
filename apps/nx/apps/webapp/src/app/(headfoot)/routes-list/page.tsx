'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Spinner,
  Accordion,
  AccordionItem,
  Chip,
  Button,
  Link,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@heroui/react';
import { MapPin, Route, Activity, ExternalLink, Download } from 'lucide-react';
import CardMatrixLoader from '../../../components/profile/CardMatrixLoader';
import PolylineRenderer from '../../../components/routes/PolylineRenderer';

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

export default function RoutesListPage() {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [distanceUnits, setDistanceUnits] = useState<Record<string, 'km' | 'mi' | 'steps'>>({}); // Track unit per route

  // Convert distance between units
  const convertDistance = (distanceKm: string, unit: 'km' | 'mi' | 'steps'): string => {
    const km = parseFloat(distanceKm.replace('km', ''));
    if (isNaN(km)) return distanceKm;
    
    switch (unit) {
      case 'mi':
        return `${(km * 0.621371).toFixed(1)}mi`;
      case 'steps':
        return `${Math.round(km * 1000)} steps`; // 1m = 1 step
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

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await fetch('/api/routes');
        if (!response.ok) {
          throw new Error('Failed to fetch routes');
        }
        const data = await response.json();
        setRoutes(data.routes || []);
      } catch (err) {
        console.error('Error fetching routes:', err);
        setError('Failed to load routes');
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, []);

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

  const getDifficultyColor = (difficulty?: string) => {
    if (!difficulty) return 'default';
    const lower = difficulty.toLowerCase();
    if (lower.includes('easy')) return 'success';
    if (lower.includes('moderate') || lower.includes('medium')) return 'warning';
    if (lower.includes('hard') || lower.includes('difficult')) return 'danger';
    return 'default';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-4">
        <Card className="w-full">
          <CardHeader className="flex gap-3">
            <Route className="w-6 h-6" />
            <div className="flex flex-col">
              <p className="text-lg font-bold">DEFCON Routes</p>
              <p className="text-small text-default-500">Available running and walking routes</p>
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="p-0">
            <CardMatrixLoader text="LOADING ROUTES" height="400px" />
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-4">
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
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4">
      <Card className="w-full">
        <CardHeader className="flex gap-3">
          <Route className="w-6 h-6" />
          <div className="flex flex-col">
            <p className="text-lg font-bold">DEFCON Routes</p>
            <p className="text-small text-default-500">
              {routes.length} {routes.length === 1 ? 'route' : 'routes'} available
            </p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="p-0">
          <div className="w-full">
            {routes.map((route, index) => (
              <div key={route.id} className="border-b border-divider last:border-b-0">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-default-50 transition-colors"
                  onClick={() => toggleRow(route.id)}
                >
                  <div className="flex items-center gap-4 flex-grow">
                    <div className="text-default-400 font-mono text-sm w-8">
                      #{index + 1}
                    </div>
                    
                    {/* Mini polyline preview */}
                    <div className="flex-shrink-0 flex justify-start">
                      {route.polyline ? (
                        <div className="border border-default-200 rounded">
                          <PolylineRenderer
                            polyline={route.polyline}
                            width={80}
                            height={60}
                            strokeColor="#3B82F6"
                            strokeWidth={2}
                            padding={5}
                            showMapTile={true}
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
                                Start (Map)
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
                                End (Map)
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

                        {/* External Links - only show if any links are available */}
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
                      {route.polyline && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-default-700">Route Map</h4>
                          <PolylineRenderer
                            polyline={route.polyline}
                            width={300}
                            height={200}
                            strokeColor="#3B82F6"
                            strokeWidth={2}
                            showMapTile={true}
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
    </div>
  );
}