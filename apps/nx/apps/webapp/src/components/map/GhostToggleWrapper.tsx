'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

interface GhostToggleWrapperProps {
  children: React.ReactNode;
  onGhostToggle: (showGhosts: boolean) => void;
}

export function GhostToggleWrapper({ children, onGhostToggle }: GhostToggleWrapperProps) {
  const [showGhosts, setShowGhosts] = useState(false);
  const keySequence = useRef<string[]>([]);
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const SPECIAL_SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  
  // Theme toggle sequence state
  const { theme } = useTheme();
  const themeToggleCount = useRef(0);
  const themeToggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousTheme = useRef<string | undefined>(theme);
  const REQUIRED_TOGGLES = 10;
  const TOGGLE_TIMEOUT = 4000; // 4 seconds

  const triggerToggle = (triggerType: 'konami' | 'theme') => {
    const newState = !showGhosts;
    setShowGhosts(newState);
    onGhostToggle(newState);
    
    // Visual feedback flash
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${newState ? '#00ff00' : '#ff0000'};
      color: #000;
      padding: 20px 40px;
      border-radius: 10px;
      font-size: 18px;
      font-weight: bold;
      z-index: 9999;
      pointer-events: none;
      opacity: 0.9;
      box-shadow: 0 0 20px ${newState ? '#00ff00' : '#ff0000'};
      text-shadow: 0 0 5px ${newState ? '#00ff00' : '#ff0000'};
    `;
    flash.textContent = newState ? 'GHOST MODE ACTIVATED' : 'GHOST MODE DEACTIVATED';
    document.body.appendChild(flash);
    
    setTimeout(() => {
      if (document.body.contains(flash)) {
        document.body.removeChild(flash);
      }
    }, 1500);
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
      if (keySequence.current.length > SPECIAL_SEQUENCE.length) {
        keySequence.current.shift();
      }

      if (keySequence.current.length === SPECIAL_SEQUENCE.length &&
          keySequence.current.every((key, index) => key === SPECIAL_SEQUENCE[index])) {
        triggerToggle('konami');
        keySequence.current = [];
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
  }, [showGhosts]);

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
        triggerToggle('theme');
        themeToggleCount.current = 0;
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
  }, [theme, showGhosts]);

  return <>{children}</>;
}