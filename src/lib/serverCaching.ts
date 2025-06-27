import { CACHE_CONFIG } from './caching';

// In-memory cache for server-side
const serverCache = new Map<string, any>();

interface CacheItem<T> {
  data: T;
  timestamp: number;
  isLoading?: boolean;
  lastUpdated?: string;
}

/**
 * Save data to server-side cache
 */
export function saveToServerCache<T>(key: string, data: T): void {
  try {
    const now = Date.now();
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: now,
      lastUpdated: new Date(now).toISOString()
    };
    serverCache.set(key, cacheItem);
  } catch (error) {
    console.warn('Failed to save to server cache:', error);
  }
}

/**
 * Get data from server-side cache if still valid
 */
export function getFromServerCache<T>(key: string, ttl: number = CACHE_CONFIG.CACHE_TTL): T | null {
  try {
    const cachedData = serverCache.get(key);
    if (!cachedData) return null;

    const now = Date.now();
    const cacheAge = now - cachedData.timestamp;
    
    // Return data if still within TTL
    if (cacheAge < ttl) {
      return cachedData.data as T;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to retrieve from server cache:', error);
    return null;
  }
}

/**
 * Update an item in server-side cache
 */
export function updateServerCache<T>(key: string, updateFn: (currentData: T | null) => T | null): boolean {
  try {
    const currentCacheItem = serverCache.get(key);
    const currentData = currentCacheItem?.data as T | null;
    
    const updatedData = updateFn(currentData);
    
    if (updatedData === null) {
      serverCache.delete(key);
      return true;
    }
    
    const now = Date.now();
    serverCache.set(key, {
      data: updatedData,
      timestamp: now,
      lastUpdated: new Date(now).toISOString()
    });
    
    return true;
  } catch (error) {
    console.warn('Failed to update server cache:', error);
    return false;
  }
}

/**
 * Update an item in an array stored in server-side cache
 */
export function updateItemInServerArrayCache<T extends Record<string, any>>(
  key: string,
  id: string,
  updateFn: (item: T) => T | null,
  idField: string = 'id'
): boolean {
  return updateServerCache<T[]>(key, (currentArray) => {
    if (!currentArray || !Array.isArray(currentArray)) {
      return currentArray;
    }
    
    const updatedArray = [...currentArray];
    const itemIndex = updatedArray.findIndex(item => item[idField] === id);
    
    if (itemIndex === -1) {
      // Item not found, nothing to update
      return updatedArray;
    }
    
    const updatedItem = updateFn(updatedArray[itemIndex]);
    
    if (updatedItem === null) {
      // Remove the item if the update function returns null
      updatedArray.splice(itemIndex, 1);
    } else {
      // Otherwise replace with updated item
      updatedArray[itemIndex] = updatedItem;
    }
    
    return updatedArray;
  });
}

/**
 * Helper to get cached responses or fetch new ones
 */
export async function getCachedOrFreshFromServer<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_CONFIG.CACHE_TTL
): Promise<T> {
  // Check server cache first
  const cachedData = getFromServerCache<T>(cacheKey, ttl);
  if (cachedData) {
    return cachedData;
  }
  
  // Otherwise fetch fresh data
  const result = await fetchFn();
  
  // Cache the new result
  saveToServerCache(cacheKey, result);
  
  return result;
} 