/**
 * A configurable in-memory cache system for various object types
 */

type CacheEntryType = {
  obj: any;
  timestamp: number;
  lastAccessed: number;
};

type CacheType = {
  [key: string]: CacheEntryType;
};

// A map of caches, each with a unique name
const caches: Record<string, CacheType> = {
  // Initialize with a default 'users' cache
  users: {}
};

// 30mins or 1000 items
const CACHE_EXPIRATION = 30 * 60 * 1000;
const CACHE_MAXENTRIES = 1000;

// Interval for checking cache size (every 5 minutes)
const CACHE_MAINTENANCE_INTERVAL = 5 * 60 * 1000;

const ensureCache = (cacheName: string): CacheType => {
  if (!caches[cacheName]) {
    caches[cacheName] = {};
  }
  return caches[cacheName];
};

export const getCachedItem = (key: string, cacheName:string) => {
  const cache = ensureCache(cacheName);
  const cachedData = cache[key];
  
  if (!cachedData) {
    return undefined;
  }
  
  const now = Date.now();
  
  // Check if cache has expired
  if (now - cachedData.timestamp > CACHE_EXPIRATION) {
    // Cache expired, remove it
    invalidateCache(key, cacheName);
    return undefined;
  }
  
  // Update last accessed time
  cache[key].lastAccessed = now;
  
  return cachedData.obj;
};

const manageCacheSize = (cacheName: string) => {
  const cache = ensureCache(cacheName);
  const cacheSize = Object.keys(cache).length;
  
  if (cacheSize > CACHE_MAXENTRIES) {
    // Sort entries by last accessed time (oldest first)
    const entries = Object.entries(cache).sort(
      ([, a], [, b]) => (a as CacheEntryType).lastAccessed - (b as CacheEntryType).lastAccessed
    );
    
    // Remove oldest entries until we're back to the max size
    const entriesToRemove = cacheSize - CACHE_MAXENTRIES;
    for (let i = 0; i < entriesToRemove; i++) {
      const [key] = entries[i];
      invalidateCache(key, cacheName);
    }
  }
};

// Set up periodic cache maintenance
let cacheMaintenanceTimer: NodeJS.Timeout | null = null;

const startCacheMaintenance = () => {
  if (!cacheMaintenanceTimer) {
    cacheMaintenanceTimer = setInterval(() => {
      // Check all caches
      Object.keys(caches).forEach(cacheName => {
        manageCacheSize(cacheName);
      });
    }, CACHE_MAINTENANCE_INTERVAL);
  }
};

export const stopCacheMaintenance = () => {
  if (cacheMaintenanceTimer) {
    clearInterval(cacheMaintenanceTimer);
    cacheMaintenanceTimer = null;
  }
};

// Start cache maintenance when this module is loaded
startCacheMaintenance();

export const setCachedItem = (key: string, obj: any, cacheName: string) => {
  const cache = ensureCache(cacheName);
  const now = Date.now();
  
  cache[key] = {
    obj: obj,
    timestamp: now,
    lastAccessed: now,
  };
};

export const invalidateCache = (key: string, cacheName: string) => {
  const cache = ensureCache(cacheName);
  if (cache[key]) {
    delete cache[key];
  }
};

export const clearCache = (cacheName?: string) => {
  if (cacheName) {
    // Clear a specific cache
    caches[cacheName] = {};
  } else {
    // Clear all caches
    Object.keys(caches).forEach((name) => {
      caches[name] = {};
    });
  }
  
  // Optionally restart the cache maintenance timer
  stopCacheMaintenance();
  startCacheMaintenance();
};
