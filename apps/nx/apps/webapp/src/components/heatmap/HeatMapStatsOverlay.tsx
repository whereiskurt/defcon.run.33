'use client';

import { useEffect, useRef, useState } from 'react';

interface HeatMapStats {
  totalRunners: number;
  totalActivities: number;
  totalDistanceKm: number;
  totalDistanceMeters: number;
  years: number;
}

interface HeatMapStatsOverlayProps {
  stats: HeatMapStats;
}

type DisplayMode = 'km' | 'miles' | 'steps';

export default function HeatMapStatsOverlay({ stats }: HeatMapStatsOverlayProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('km');
  const keySequence = useRef<string[]>([]);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const KONAMI_SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

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
        // 1 meter = 1 step as requested
        return {
          value: stats.totalDistanceMeters.toLocaleString(),
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
        e.preventDefault();
        e.stopPropagation();
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
        `;
        const nextMode = displayMode === 'km' ? 'miles' : displayMode === 'miles' ? 'steps' : 'km';
        flash.textContent = `Units changed to ${nextMode.toUpperCase()}`;
        document.body.appendChild(flash);
        
        setTimeout(() => {
          if (document.body.contains(flash)) {
            document.body.removeChild(flash);
          }
        }, 1500);
        
        return;
      }

      sequenceTimeoutRef.current = setTimeout(() => {
        keySequence.current = [];
      }, 10000);
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase to handle before other listeners
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (sequenceTimeoutRef.current) {
        clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, []);

  const distance = getDistanceDisplay();

  return (
    <div 
      className="fixed top-16 left-0 right-0 bg-black/90 text-white px-4 py-2 border-b border-gray-600 z-[9999] cursor-pointer"
      onClick={cycleDisplayMode}
      title="Click or use konami code (↑↑↓↓←→←→BA) to cycle units"
    >
      <div className="max-w-[900px] mx-auto flex items-center justify-between">
        <div className="text-sm font-bold">
          🔥 Activity Heat Map
        </div>
        <div className="flex items-center space-x-6 text-xs">
          <div className="flex items-center space-x-1">
            <span>Runners:</span>
            <span className="font-mono font-bold">{stats.totalRunners.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>Activities:</span>
            <span className="font-mono font-bold">{stats.totalActivities.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>Distance:</span>
            <span className="font-mono font-bold">{distance.value} {distance.unit}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>Years:</span>
            <span className="font-mono font-bold">{stats.years}</span>
          </div>
        </div>
      </div>
    </div>
  );
}