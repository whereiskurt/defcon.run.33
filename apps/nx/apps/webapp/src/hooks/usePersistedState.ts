import { useState, useEffect } from 'react';

/**
 * Custom hook that persists state to localStorage with SSR-safe hydration
 * @param key - localStorage key to store the value
 * @param defaultValue - default value to use if nothing is stored
 * @returns [state, setState] tuple similar to useState
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize with default value to avoid hydration mismatch
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load persisted value on client-side hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        setState(parsed);
      }
    } catch (error) {
      console.warn(`Failed to load persisted state for key "${key}":`, error);
    } finally {
      setIsHydrated(true);
    }
  }, [key]);

  // Persist to localStorage whenever state changes (but only after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Failed to persist state for key "${key}":`, error);
    }
  }, [key, state, isHydrated]);

  return [state, setState];
}