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
  CACHE_TTL: 30 * 1000, // 30 seconds for most data (was 15 minutes)
  SESSIONS_CACHE_TTL: 30 * 1000, // 30 seconds for sessions
  TUTORS_CACHE_TTL: 5 * 60 * 1000, // 5 minutes for tutors (was 24 hours)
  USER_PROFILE_CACHE_TTL: 5 * 60 * 1000, // 5 minutes for user profiles (was 1 hour)
  REVIEWS_CACHE_TTL: 5 * 60 * 1000, // 5 minutes for reviews (was 30 minutes)
  
  // Background refresh settings
  BACKGROUND_REFRESH_INTERVAL: 60 * 1000, // 1 minute (was 5 minutes)
  STALE_WHILE_REVALIDATE_TTL: 5 * 60 * 1000, // 5 minutes (was 1 hour)
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
    
    // Determine appropriate TTL based on the key
    let maxAge = ttl;
    if (!maxAge) {
      // Use specific TTL based on cache key type
      if (key === CACHE_CONFIG.TUTORS_CACHE_KEY) {
        maxAge = CACHE_CONFIG.TUTORS_CACHE_TTL;
      } else if (key === CACHE_CONFIG.USER_PROFILE_CACHE_KEY) {
        maxAge = CACHE_CONFIG.USER_PROFILE_CACHE_TTL;
      } else if (key.startsWith(CACHE_CONFIG.REVIEWS_CACHE_PREFIX)) {
        maxAge = CACHE_CONFIG.REVIEWS_CACHE_TTL;
      } else if (key === CACHE_CONFIG.SESSIONS_CACHE_KEY || 
                key.startsWith('user_sessions:') || 
                key.startsWith('session:')) {
        maxAge = CACHE_CONFIG.SESSIONS_CACHE_TTL;
      } else {
        // Default TTL for other types
        maxAge = CACHE_CONFIG.CACHE_TTL;
      }
    }
    
    const staleWhileRevalidateTtl = CACHE_CONFIG.STALE_WHILE_REVALIDATE_TTL;

    // Check if cache is still fresh
    if (now - cacheItem.timestamp < maxAge) {
      return cacheItem.data;
    }
    
    // If stale but within stale-while-revalidate window, return data but mark for refresh
    if (allowStale && now - cacheItem.timestamp < maxAge + staleWhileRevalidateTtl) {
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
  } catch (error) {
    console.warn('Failed to invalidate cache:', error);
  }
}

/**
 * Update cache data with realtime updates instead of invalidating
 * This prevents cache from reverting to stale data after updates
 * 
 * @param key Cache key 
 * @param updateFn Function that receives current data and returns updated data
 * @returns True if cache was updated successfully
 */
export function updateCache<T>(key: string, updateFn: (currentData: T | null) => T | null): boolean {
  try {
    // Get the current cache item
    const cachedData = localStorage.getItem(key);
    let cacheItem: CacheItem<T> | null = null;
    
    if (cachedData) {
      try {
        cacheItem = JSON.parse(cachedData) as CacheItem<T>;
      } catch (e) {
        // If we can't parse the cache, just invalidate it
        localStorage.removeItem(key);
        return false;
      }
    }
    
    // Apply the update function to the current data
    const currentData = cacheItem ? cacheItem.data : null;
    const updatedData = updateFn(currentData);
    
    // If the update function returns null, remove the cache
    if (updatedData === null) {
      localStorage.removeItem(key);
      return true;
    }
    
    // Save the updated data with current timestamp
    const now = Date.now();
    const updatedCacheItem: CacheItem<T> = {
      data: updatedData,
      timestamp: now, // Update the timestamp to extend cache life
      isLoading: false,
      lastUpdated: new Date(now).toISOString()
    };
    
    localStorage.setItem(key, JSON.stringify(updatedCacheItem));
    return true;
  } catch (error) {
    console.warn('Failed to update cache:', error);
    return false;
  }
}

/**
 * Update a specific item in an array cache by its ID
 * Useful for updating sessions or messages in a collection
 * 
 * @param key Cache key for the array
 * @param id ID of the item to update
 * @param idField Field name that contains the ID (default: 'id')
 * @param updateFn Function that updates the specific item
 * @returns True if cache was updated successfully
 */
export function updateItemInArrayCache<T extends Record<string, any>>(
  key: string,
  id: string,
  updateFn: (item: T) => T | null,
  idField: string = 'id'
): boolean {
  return updateCache<T[]>(key, (currentItems) => {
    // If no items cached, nothing to update
    if (!currentItems || !Array.isArray(currentItems)) {
      return null;
    }
    
    // Find and update the specific item
    const updatedItems: T[] = [];
    let foundItem = false;
    
    for (const item of currentItems) {
      if (item && item[idField] === id) {
        // Found the item to update
        foundItem = true;
        const updatedItem = updateFn(item);
        
        // If update returns null, remove the item
        if (updatedItem !== null) {
          updatedItems.push(updatedItem);
        }
      } else {
        updatedItems.push(item);
      }
    }
    
    // If we didn't find the item, just return the original array
    if (!foundItem) {
      return currentItems;
    }
    
    return updatedItems;
  });
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
    } else {
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
    } else {
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