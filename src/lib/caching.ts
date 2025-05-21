// Cache utility functions

// Define cache structure with timestamps for TTL
export interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Cache configuration
export const CACHE_CONFIG = {
  CONVERSATIONS_CACHE_KEY: 'cached_conversations',
  MESSAGES_CACHE_PREFIX: 'cached_messages_',
  TUTORS_CACHE_KEY: 'cached_tutors',
  CACHE_TTL: 15 * 60 * 1000, // 15 minutes by default
  TUTORS_CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours for tutors
};

/**
 * Save data to browser cache with timestamp
 * @param key Cache key
 * @param data Data to store
 * @param ttl Optional TTL override (in milliseconds)
 */
export function saveToCache<T>(key: string, data: T, ttl?: number): void {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
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
 * @returns The cached data or null if not found/invalid
 */
export function getFromCache<T>(key: string, ttl?: number): T | null {
  try {
    const cachedData = localStorage.getItem(key);
    if (!cachedData) return null;

    const cacheItem: CacheItem<T> = JSON.parse(cachedData);
    const now = Date.now();
    const maxAge = ttl || CACHE_CONFIG.CACHE_TTL;

    // Check if cache is still valid
    if (now - cacheItem.timestamp < maxAge) {
      return cacheItem.data;
    }
    
    // Cache expired, remove it
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
 * Clear all application cache data
 * Removes conversations, messages, and tutors caches
 */
export function clearAllCache(): void {
  try {
    localStorage.removeItem(CACHE_CONFIG.CONVERSATIONS_CACHE_KEY);
    localStorage.removeItem(CACHE_CONFIG.TUTORS_CACHE_KEY);
    
    // Find and remove all messages cache entries
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_CONFIG.MESSAGES_CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
} 