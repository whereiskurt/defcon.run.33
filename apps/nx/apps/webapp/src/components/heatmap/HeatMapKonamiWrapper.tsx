'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';

interface HeatMapStats {
  totalRunners: number;
  totalActivities: number;
  totalDistanceKm: number;
  totalDistanceMeters: number;
  years: number;
}

interface HeatMapKonamiWrapperProps {
  children: React.ReactNode;
  stats: HeatMapStats;
  routes: any[];
}

type DisplayMode = 'km' | 'miles' | 'steps';

export function HeatMapKonamiWrapper({ children, stats, routes }: HeatMapKonamiWrapperProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('km');
  const keySequence = useRef<string[]>([]);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const KONAMI_SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  
  // Theme toggle sequence state
  const { theme } = useTheme();
  const themeToggleCount = useRef(0);
  const themeToggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousTheme = useRef<string | undefined>(theme);
  const REQUIRED_TOGGLES = 10;
  const TOGGLE_TIMEOUT = 4000; // 4 seconds

  // Layer visibility tracking
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(() => {
    // Initialize with all layers visible by default
    const layerSet = new Set<string>();
    routes.forEach(route => {
      route.layers?.forEach((layer: any) => {
        if (layer.visible) {
          layerSet.add(layer.title);
        }
      });
    });
    return layerSet;
  });

  // Dynamic positioning relative to zoom buttons
  const [statsPosition, setStatsPosition] = useState({ top: 80, left: 144 });
  
  // Dynamic stats calculation based on visible layers
  const [currentStats, setCurrentStats] = useState(stats);
  
  // Function to calculate stats from visible routes
  const calculateStatsFromVisibleLayers = useCallback((visibleLayerNames: string[]) => {
    console.log('=== Calculating stats for visible layers:', visibleLayerNames);
    
    if (visibleLayerNames.length === 0) {
      console.log('No layers visible - returning zero stats');
      return {
        totalRunners: 0,
        totalActivities: 0,
        totalDistanceKm: 0,
        totalDistanceMeters: 0,
        years: 0
      };
    }
    
    // Filter routes based on visible layers
    const visibleRoutes = routes.filter(route => {
      const hasVisibleLayer = route.layers?.some((layer: any) => 
        visibleLayerNames.includes(layer.title)
      );
      if (hasVisibleLayer) {
        console.log('Route visible:', route.id, 'layers:', route.layers?.map((l: any) => l.title));
      }
      return hasVisibleLayer;
    });
    
    console.log(`Found ${visibleRoutes.length} visible routes out of ${routes.length} total`);
    
    // Calculate stats from visible routes
    const runners = new Set();
    let activities = 0;
    let totalDistanceMeters = 0;
    
    visibleRoutes.forEach(route => {
      const routeDetails = route.attributes?.route_details;
      console.log('Route details:', routeDetails);
      
      if (routeDetails && routeDetails.userId) {
        runners.add(routeDetails.userId); // Use actual user ID
        activities++;
        if (routeDetails.distance) {
          totalDistanceMeters += parseFloat(routeDetails.distance);
        }
      }
    });
    
    const newStats = {
      totalRunners: runners.size,
      totalActivities: activities,
      totalDistanceKm: Math.round(totalDistanceMeters / 1000),
      totalDistanceMeters: Math.round(totalDistanceMeters),
      years: new Set(visibleRoutes.map(route => route.attributes?.route_details?.year).filter(Boolean)).size
    };
    
    console.log('Calculated stats:', newStats);
    return newStats;
  }, [routes]);

  const getDistanceDisplay = () => {
    switch (displayMode) {
      case 'km':
        return {
          value: currentStats.totalDistanceKm.toLocaleString(),
          unit: 'km'
        };
      case 'miles':
        const miles = Math.round(currentStats.totalDistanceKm * 0.621371);
        return {
          value: miles.toLocaleString(),
          unit: 'miles'
        };
      case 'steps':
        // 1 meter = 1 step as requested (no comma formatting)
        return {
          value: currentStats.totalDistanceMeters.toString(),
          unit: 'steps'
        };
      default:
        return {
          value: currentStats.totalDistanceKm.toLocaleString(),
          unit: 'km'
        };
    }
  };

  const cycleDisplayMode = () => {
    setDisplayMode(prev => {
      switch (prev) {
        case 'km': return 'miles';
        case 'miles': return 'steps';
        case 'steps': return 'km';
        default: return 'km';
      }
    });
  };

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
      if (keySequence.current.length > KONAMI_SEQUENCE.length) {
        keySequence.current.shift();
      }

      if (keySequence.current.length === KONAMI_SEQUENCE.length &&
          keySequence.current.every((key, index) => key === KONAMI_SEQUENCE[index])) {
        cycleDisplayMode();
        keySequence.current = [];
        
        // Visual feedback flash for unit change
        const flash = document.createElement('div');
        flash.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #ff0000;
          color: #fff;
          padding: 15px 30px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          z-index: 10000;
          pointer-events: none;
          opacity: 0.9;
          box-shadow: 0 0 15px #ff0000;
          max-width: 900px;
          width: calc(100% - 2rem);
          text-align: center;
        `;
        const nextMode = displayMode === 'km' ? 'miles' : displayMode === 'miles' ? 'steps' : 'km';
        flash.textContent = `Units changed to ${nextMode.toUpperCase()}`;
        document.body.appendChild(flash);
        
        setTimeout(() => {
          if (document.body.contains(flash)) {
            document.body.removeChild(flash);
          }
        }, 1500);
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
  }, [displayMode]);

  // Theme toggle sequence tracking
  useEffect(() => {
    // Skip initial theme load
    if (previousTheme.current === undefined) {
      previousTheme.current = theme;
      return;
    }

    // Only count if theme actually changed
    if (theme !== previousTheme.current && theme !== undefined) {
      previousTheme.current = theme;
      
      // Reset timeout on each toggle
      if (themeToggleTimeoutRef.current) {
        clearTimeout(themeToggleTimeoutRef.current);
      }

      themeToggleCount.current += 1;

      if (themeToggleCount.current >= REQUIRED_TOGGLES) {
        cycleDisplayMode();
        themeToggleCount.current = 0;
        
        // Visual feedback flash for theme-triggered unit change
        const flash = document.createElement('div');
        flash.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #ff0000;
          color: #fff;
          padding: 15px 30px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          z-index: 10000;
          pointer-events: none;
          opacity: 0.9;
          box-shadow: 0 0 15px #ff0000;
          max-width: 900px;
          width: calc(100% - 2rem);
          text-align: center;
        `;
        const nextMode = displayMode === 'km' ? 'miles' : displayMode === 'miles' ? 'steps' : 'km';
        flash.textContent = `Theme toggle detected! Units changed to ${nextMode.toUpperCase()}`;
        document.body.appendChild(flash);
        
        setTimeout(() => {
          if (document.body.contains(flash)) {
            document.body.removeChild(flash);
          }
        }, 2000);
        return;
      }

      // Set timeout to reset toggle count
      themeToggleTimeoutRef.current = setTimeout(() => {
        themeToggleCount.current = 0;
      }, TOGGLE_TIMEOUT);
    }

    return () => {
      if (themeToggleTimeoutRef.current) {
        clearTimeout(themeToggleTimeoutRef.current);
      }
    };
  }, [theme, displayMode]);

  // Track zoom button position to position stats panel beside it
  useEffect(() => {
    const updateStatsPosition = () => {
      const zoomControl = document.querySelector('.leaflet-control-zoom');
      if (zoomControl) {
        const rect = zoomControl.getBoundingClientRect();
        setStatsPosition({
          top: rect.top,
          left: rect.right + 8 // 8px padding to the right of zoom buttons
        });
      }
    };

    // Initial positioning
    updateStatsPosition();

    // Update on window resize
    window.addEventListener('resize', updateStatsPosition);

    // Use a timer to check for zoom control after map loads
    const checkInterval = setInterval(updateStatsPosition, 100);
    
    // Clean up after 5 seconds (map should be loaded by then)
    const cleanupTimer = setTimeout(() => {
      clearInterval(checkInterval);
    }, 5000);

    return () => {
      window.removeEventListener('resize', updateStatsPosition);
      clearInterval(checkInterval);
      clearTimeout(cleanupTimer);
    };
  }, []);

  // Listen for layer visibility changes and update stats
  useEffect(() => {
    const updateStatsFromMap = () => {
      // Get currently visible layers
      const visibleLayers: string[] = [];
      
      // Check if layer controls exist and get their state
      const layerControlElement = document.querySelector('.leaflet-control-layers');
      if (layerControlElement) {
        const checkboxes = layerControlElement.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach((checkbox: any) => {
          const label = checkbox.nextSibling?.textContent?.trim() || checkbox.parentNode?.textContent?.trim();
          if (label) {
            visibleLayers.push(label);
          }
        });
      }

      console.log('Visible layers for stats:', visibleLayers);
      
      // Calculate new stats
      const newStats = calculateStatsFromVisibleLayers(visibleLayers);
      setCurrentStats(newStats);
    };

    // Trigger immediate update
    updateStatsFromMap();

    // Set up a periodic check
    const interval = setInterval(updateStatsFromMap, 1000);

    return () => clearInterval(interval);
  }, [calculateStatsFromVisibleLayers]);

  const distance = getDistanceDisplay();

  return (
    <>
      {children}
      {/* Stats Panel */}
      <div 
        className="fixed bg-white text-black p-1 rounded shadow-md border border-gray-300 z-[9999] cursor-pointer"
        onClick={cycleDisplayMode}
        title="Click, use konami code (↑↑↓↓←→←→BA), or rapidly toggle theme 10x to cycle units"
        style={{ 
          fontSize: '11px', 
          minWidth: '60px',
          top: `${statsPosition.top}px`,
          left: `${statsPosition.left}px`
        }}
      >
        <div className="flex flex-col items-center space-y-1 text-center">
          <div className="text-center">
            <div className="text-lg font-black text-black flex items-baseline justify-center space-x-1">
              <span 
                className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent font-black"
                style={{ 
                  textShadow: '2px 2px 4px rgba(255,0,0,0.3)',
                  filter: 'drop-shadow(0 0 8px rgba(255,0,0,0.4))'
                }}
              >
                {distance.value}
              </span>
              <span className="text-sm font-bold text-gray-600">{distance.unit}</span>
            </div>
          </div>
          <div className="text-xs text-gray-600 flex items-center space-x-1">
            <span className="font-mono text-black">{currentStats.totalRunners.toLocaleString()}</span>
            <span>👟</span>
            <span>×</span>
            <span className="font-mono text-black">{currentStats.totalActivities.toLocaleString()}</span>
            <span>🥕</span>
          </div>
        </div>
      </div>
    </>
  );
}