// Advanced caching system with background refresh

// Define cache structure with timestamps for TTL and loading status
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  isLoading?: boolean;
  lastUpdated?: string;
}

// Cache configuration
export const CACHE_CONFIG = {
  // Cache keys
  CONVERSATIONS_CACHE_KEY: 'cached_conversations',
  MESSAGES_CACHE_PREFIX: 'cached_messages_',
  TUTORS_CACHE_KEY: 'cached_tutors',
  USER_PROFILE_CACHE_KEY: 'cached_user_profile',
  REVIEWS_CACHE_PREFIX: 'cached_reviews_',
  SESSIONS_CACHE_KEY: 'cached_sessions',
  
  // TTL settings (milliseconds)
  CACHE_TTL: 15 * 60 * 1000, // 15 minutes by default
  TUTORS_CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours for tutors
  USER_PROFILE_CACHE_TTL: 60 * 60 * 1000, // 1 hour for user profiles
  REVIEWS_CACHE_TTL: 30 * 60 * 1000, // 30 minutes for reviews
  
  // Background refresh settings
  BACKGROUND_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  STALE_WHILE_REVALIDATE_TTL: 60 * 60 * 1000, // 1 hour (allow stale content while revalidating)
};

// Track pending refreshes
const pendingRefreshes: Record<string, Promise<any> | undefined> = {};

/**
 * Save data to browser cache with timestamp
 * @param key Cache key
 * @param data Data to store
 * @param ttl Optional TTL override (in milliseconds)
 */
export function saveToCache<T>(key: string, data: T, ttl?: number): void {
  try {
    const now = Date.now();
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: now,
      isLoading: false,
      lastUpdated: new Date(now).toISOString()
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
    console.debug(`Cache saved: ${key}`);
  } catch (error) {
    console.warn('Failed to save to cache:', error);
    // Silent fail - caching is a performance optimization, not critical
  }
}

/**
 * Get data from cache if still valid
 * @param key Cache key
 * @param ttl Optional TTL override (in milliseconds)
 * @param allowStale Whether to return stale data (beyond TTL but within stale TTL)
 * @returns The cached data or null if not found/invalid
 */
export function getFromCache<T>(key: string, ttl?: number, allowStale = true): T | null {
  try {
    const cachedData = localStorage.getItem(key);
    if (!cachedData) return null;

    const cacheItem: CacheItem<T> = JSON.parse(cachedData);
    const now = Date.now();
    const maxAge = ttl || CACHE_CONFIG.CACHE_TTL;
    const staleWhileRevalidateTtl = CACHE_CONFIG.STALE_WHILE_REVALIDATE_TTL;

    // Check if cache is still fresh
    if (now - cacheItem.timestamp < maxAge) {
      return cacheItem.data;
    }
    
    // If stale but within stale-while-revalidate window, return data but mark for refresh
    if (allowStale && now - cacheItem.timestamp < maxAge + staleWhileRevalidateTtl) {
      console.debug(`Returning stale data for ${key}, age: ${(now - cacheItem.timestamp) / 1000}s`);
      return cacheItem.data;
    }
    
    // Cache expired and beyond stale window, remove it
    localStorage.removeItem(key);
    return null;
  } catch (error) {
    console.warn('Failed to retrieve from cache:', error);
    // Remove potentially corrupted cache
    try {
      localStorage.removeItem(key);
    } catch {}
    return null;
  }
}

/**
 * Mark a cache entry as loading
 * @param key Cache key
 */
export function markCacheAsLoading(key: string): void {
  try {
    const cachedData = localStorage.getItem(key);
    if (!cachedData) {
      // No existing cache, create a new loading entry
      const cacheItem: CacheItem<null> = {
        data: null,
        timestamp: Date.now(),
        isLoading: true
      };
      localStorage.setItem(key, JSON.stringify(cacheItem));
      return;
    }

    // Update existing cache item
    const cacheItem = JSON.parse(cachedData);
    cacheItem.isLoading = true;
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.warn('Failed to mark cache as loading:', error);
  }
}

/**
 * Check if a cache entry is currently loading
 * @param key Cache key
 * @returns Whether the cache is loading
 */
export function isCacheLoading(key: string): boolean {
  try {
    const cachedData = localStorage.getItem(key);
    if (!cachedData) return false;

    const cacheItem = JSON.parse(cachedData);
    return !!cacheItem.isLoading;
  } catch {
    return false;
  }
}

/**
 * Invalidate a specific cache entry
 * @param key Cache key to invalidate
 */
export function invalidateCache(key: string): void {
  try {
    localStorage.removeItem(key);
    console.debug(`Cache invalidated: ${key}`);
  } catch (error) {
    console.warn('Failed to invalidate cache:', error);
  }
}

/**
 * Clear all application cache data
 * Removes conversations, messages, tutors, and other caches
 */
export function clearAllCache(): void {
  try {
    Object.values(CACHE_CONFIG).forEach(value => {
      if (typeof value === 'string' && !value.includes('_TTL') && !value.includes('_INTERVAL')) {
        // It's a cache key
        if (value.endsWith('_PREFIX')) {
          // Handle prefix-based cache keys
          const prefix = value;
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith(prefix)) {
              localStorage.removeItem(key);
            }
          });
        } else {
          // Direct cache key
          localStorage.removeItem(value);
        }
      }
    });
    console.debug('All cache cleared');
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
}

/**
 * Get and cache data with automatic background refresh
 * 
 * @param key Cache key
 * @param fetchFn Function to fetch fresh data
 * @param ttl Cache TTL in milliseconds
 * @param options Additional options
 * @returns The cached or freshly fetched data
 */
export async function getAndCacheData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_CONFIG.CACHE_TTL,
  options: {
    forceRefresh?: boolean;
    backgroundRefresh?: boolean;
  } = {}
): Promise<T> {
  const { forceRefresh = false, backgroundRefresh = true } = options;
  
  // Check if we already have a pending refresh for this key
  const pendingRefresh = pendingRefreshes[key];
  if (pendingRefresh) {
    try {
      // Wait for the pending refresh to complete
      const result = await pendingRefresh;
      return result;
    } catch (error) {
      // If the pending refresh fails, continue with our own attempt
      console.warn(`Pending refresh for ${key} failed:`, error);
      delete pendingRefreshes[key];
    }
  }
  
  // Try to get from cache first (unless forced refresh)
  if (!forceRefresh) {
    const cachedData = getFromCache<T>(key, ttl);
    if (cachedData) {
      // If data exists but is stale, refresh in background
      const now = Date.now();
      const cachedItem = JSON.parse(localStorage.getItem(key) || '{}');
      const cacheAge = now - (cachedItem.timestamp || 0);
      
      if (backgroundRefresh && cacheAge > ttl && !isCacheLoading(key)) {
        console.debug(`Background refreshing ${key}, age: ${cacheAge / 1000}s`);
        refreshCacheInBackground(key, fetchFn, ttl);
      }
      
      return cachedData;
    }
  }
  
  // No valid cache, fetch fresh data
  markCacheAsLoading(key);
  
  // Store this fetch operation as a pending refresh
  const fetchPromise = fetchFn().then(freshData => {
    saveToCache(key, freshData, ttl);
    delete pendingRefreshes[key];
    return freshData;
  }).catch(error => {
    // Check if this is a permission error (403)
    const errorString = String(error);
    if (errorString.includes('403') || errorString.toLowerCase().includes('forbidden')) {
      console.debug(`Permission denied (403) for ${key} - this is expected for non-premium users or when not authenticated`);
    } else {
    console.error(`Error fetching data for ${key}:`, error);
    }
    delete pendingRefreshes[key];
    throw error;
  });
  
  pendingRefreshes[key] = fetchPromise;
  return fetchPromise;
}

/**
 * Refresh cache in background without blocking UI
 */
function refreshCacheInBackground<T>(
  key: string, 
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_CONFIG.CACHE_TTL
): void {
  // Don't start another refresh if one is already pending
  if (pendingRefreshes[key]) return;
  
  // Start background refresh
  const fetchPromise = fetchFn().then(freshData => {
    saveToCache(key, freshData, ttl);
    delete pendingRefreshes[key];
    return freshData;
  }).catch(error => {
    // Check if this is a permission error (403)
    const errorString = String(error);
    if (errorString.includes('403') || errorString.toLowerCase().includes('forbidden')) {
      console.debug(`Background refresh permission denied (403) for ${key} - this is expected for non-premium users`);
    } else {
    console.error(`Background refresh failed for ${key}:`, error);
    }
    delete pendingRefreshes[key];
    throw error;
  });
  
  pendingRefreshes[key] = fetchPromise;
}

/**
 * Initialize caching system and prefetch critical data
 */
export function initCachingSystem(): void {
  // Set up periodic background refresh for all caches
  const setupBackgroundRefresh = () => {
    const refreshInterval = CACHE_CONFIG.BACKGROUND_REFRESH_INTERVAL;
    
    setInterval(() => {
      // Check all cache items and refresh those that are stale
      Object.keys(localStorage).forEach(key => {
        try {
          // Only process our own cache entries
          if (!Object.values(CACHE_CONFIG).some(value => 
            typeof value === 'string' && (key === value || key.startsWith(value.replace('_PREFIX', '')))
          )) {
            return;
          }
          
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (!item.timestamp) return;
          
          const now = Date.now();
          const age = now - item.timestamp;
          
          // Get the appropriate TTL for this cache key
          let ttl = CACHE_CONFIG.CACHE_TTL;
          if (key === CACHE_CONFIG.TUTORS_CACHE_KEY) {
            ttl = CACHE_CONFIG.TUTORS_CACHE_TTL;
          } else if (key === CACHE_CONFIG.USER_PROFILE_CACHE_KEY) {
            ttl = CACHE_CONFIG.USER_PROFILE_CACHE_TTL;
          } else if (key.startsWith(CACHE_CONFIG.REVIEWS_CACHE_PREFIX)) {
            ttl = CACHE_CONFIG.REVIEWS_CACHE_TTL;
          }
          
          // If cache is stale but not being refreshed, mark it for refresh
          // The actual refresh will happen when the data is next accessed
          if (age > ttl && !isCacheLoading(key)) {
            console.debug(`Marking ${key} for refresh, age: ${age / 1000}s`);
            const updatedItem = { ...item, needsRefresh: true };
            localStorage.setItem(key, JSON.stringify(updatedItem));
          }
        } catch (e) {
          // Ignore errors processing individual cache entries
        }
      });
    }, refreshInterval);
  };
  
  // Call setup function
  setupBackgroundRefresh();
  
  // Expose cache status to window for debugging
  if (typeof window !== 'undefined') {
    (window as any).__cacheStatus = {
      getCacheStatus: () => {
        const status: Record<string, any> = {};
        Object.keys(localStorage).forEach(key => {
          try {
            const item = JSON.parse(localStorage.getItem(key) || '{}');
            if (item.timestamp) {
              const now = Date.now();
              status[key] = {
                age: (now - item.timestamp) / 1000,
                isLoading: !!item.isLoading,
                lastUpdated: item.lastUpdated,
                hasData: !!item.data
              };
            }
          } catch (e) {
            // Ignore non-cache items
          }
        });
        return status;
      },
      clearCache: clearAllCache
    };
  }
} 