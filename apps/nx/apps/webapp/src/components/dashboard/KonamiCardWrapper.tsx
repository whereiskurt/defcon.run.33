'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

interface KonamiCardWrapperProps {
  children: React.ReactNode;
  defaultShow: boolean;
}

export function KonamiCardWrapper({ children, defaultShow }: KonamiCardWrapperProps) {
  const [showCard, setShowCard] = useState(defaultShow);
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
    const newState = !showCard;
    setShowCard(newState);
    
    // Visual feedback flash
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${newState ? '#00ff00' : '#ff0000'};
      opacity: 0.3;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(flash);
    
    setTimeout(() => {
      if (document.body.contains(flash)) {
        document.body.removeChild(flash);
      }
    }, 200);
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
  }, [showCard]);

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
  }, [theme, showCard]);

  return showCard ? <>{children}</> : null;
}