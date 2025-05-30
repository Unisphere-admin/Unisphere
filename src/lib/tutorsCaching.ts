/**
 * @deprecated Use the new caching system in src/lib/caching.ts and src/hooks/useCachedData.ts
 */

import { createClient } from "@/utils/supabase/client";
import { CACHE_CONFIG, getAndCacheData, getFromCache, saveToCache } from "./caching";

/**
 * Check if user is authenticated
 * @deprecated Use the auth context instead
 */
async function isAuthenticated(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
}

/**
 * Fetch tutors with caching
 * @deprecated Use useCachedTutors from src/hooks/useCachedData.ts instead
 */
export async function fetchTutorsWithCache() {
  console.warn('fetchTutorsWithCache is deprecated. Use useCachedTutors hook instead.');
  
  try {
    // For backward compatibility, use the getAndCacheData function
    return await getAndCacheData(
      CACHE_CONFIG.TUTORS_CACHE_KEY,
      fetchTutorsFromAPI,
      CACHE_CONFIG.TUTORS_CACHE_TTL
    );
  } catch (error) {
    console.error("Error fetching tutors with cache:", error);
    return [];
  }
}

/**
 * Fetch tutors from API directly
 * @deprecated Use fetch function with the tutors API endpoint directly
 */
export async function fetchTutorsFromAPI(isBackgroundRefresh = false) {
  console.warn('fetchTutorsFromAPI is deprecated. Use fetch with the tutors API endpoint directly.');
  
  try {
    const response = await fetch('/api/tutors', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tutors: ${response.status}`);
    }
    
    const data = await response.json();
    
    // For backward compatibility, save to cache
    saveToCache(CACHE_CONFIG.TUTORS_CACHE_KEY, data.tutors || [], CACHE_CONFIG.TUTORS_CACHE_TTL);
    
    return data.tutors || [];
  } catch (error) {
    console.error("Error fetching tutors from API:", error);
    
    // Try to get from cache if API request fails
    const cachedTutors = getFromCache(CACHE_CONFIG.TUTORS_CACHE_KEY);
    return cachedTutors || [];
  }
}

/**
 * Invalidate tutors cache
 * @deprecated Use invalidateCache from src/lib/caching.ts instead
 */
export function invalidateTutorsCache() {
  console.warn('invalidateTutorsCache is deprecated. Use invalidateCache from caching.ts instead.');
  try {
    localStorage.removeItem(CACHE_CONFIG.TUTORS_CACHE_KEY);
    console.log('Tutors cache invalidated');
  } catch (error) {
    console.error('Failed to invalidate tutors cache:', error);
  }
} 