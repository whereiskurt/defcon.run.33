'use client';

import { useEffect, useRef, useState } from 'react';
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

  const getDistanceDisplay = () => {
    switch (displayMode) {
      case 'km':
        return {
          value: stats.totalDistanceKm.toLocaleString(),
          unit: 'km'
        };
      case 'miles':
        const miles = Math.round(stats.totalDistanceKm * 0.621371);
        return {
          value: miles.toLocaleString(),
          unit: 'miles'
        };
      case 'steps':
        // 1 meter = 1 step as requested (no comma formatting)
        return {
          value: stats.totalDistanceMeters.toString(),
          unit: 'steps'
        };
      default:
        return {
          value: stats.totalDistanceKm.toLocaleString(),
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

  const distance = getDistanceDisplay();

  return (
    <>
      {children}
      {/* Stats Panel */}
      <div 
        className="fixed top-16 left-16 bg-white text-black p-1 rounded shadow-md border border-gray-300 z-[9999] cursor-pointer"
        onClick={cycleDisplayMode}
        title="Click, use konami code (↑↑↓↓←→←→BA), or rapidly toggle theme 10x to cycle units"
        style={{ fontSize: '11px', minWidth: '60px' }}
      >
        <div className="flex flex-col items-center space-y-1 text-center">
          <div className="text-xs text-gray-600">
            <div>Rabbits: <span className="font-mono text-black">{stats.totalRunners.toLocaleString()}</span></div>
          </div>
          <div className="text-xs text-gray-600">
            <div>Activities: <span className="font-mono text-black">{stats.totalActivities.toLocaleString()}</span></div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-black">{distance.value}</div>
            <div className="text-xs font-bold text-gray-600">{distance.unit}</div>
          </div>
        </div>
      </div>
    </>
  );
}