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
    return false;
  }
}

/**
 * Prefetch tutors data - modern implementation with proper promise handling
 */
export async function prefetchTutors(): Promise<boolean> {
  try {
    
    // Check if we already have cached tutors data
    const cachedTutors = getFromCache(CACHE_CONFIG.TUTORS_CACHE_KEY, CACHE_CONFIG.TUTORS_CACHE_TTL);
    
    // If we have fresh cached data, we can exit early
    if (cachedTutors) {
      return true;
    }
    
    // Fetch fresh data from the API and cache it
    const result = await getAndCacheData(
      CACHE_CONFIG.TUTORS_CACHE_KEY,
      async () => {
        try {
        const response = await fetch('/api/tutors', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
          // Even if there's a 401 error, the API now returns limited data for unauthenticated users
          // so we should still get a successful response
        if (!response.ok) {
            return []; // Return empty array instead of throwing
        }
        
        const data = await response.json();
        return data.tutors || [];
        } catch (error) {
          return []; // Return empty array for network errors
        }
      },
      CACHE_CONFIG.TUTORS_CACHE_TTL
    );
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Fetch tutors with caching
 * @deprecated Use useCachedTutors from src/hooks/useCachedData.ts instead
 */
export async function fetchTutorsWithCache() {
  
  try {
    // For backward compatibility, use the getAndCacheData function
    return await getAndCacheData(
      CACHE_CONFIG.TUTORS_CACHE_KEY,
      fetchTutorsFromAPI,
      CACHE_CONFIG.TUTORS_CACHE_TTL
    );
  } catch (error) {
    return [];
  }
}

/**
 * Fetch tutors from API directly
 * @deprecated Use fetch function with the tutors API endpoint directly
 */
export async function fetchTutorsFromAPI(isBackgroundRefresh = false) {
  
  try {
    const response = await fetch('/api/tutors', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
    
    // With the updated API, even unauthenticated requests should succeed
    // but we'll handle errors gracefully just in case
    if (!response.ok) {
      
      // Try to get from cache if API request fails
      const cachedTutors = getFromCache(CACHE_CONFIG.TUTORS_CACHE_KEY);
      return cachedTutors || [];
    }
    
    const data = await response.json();
    
    // For backward compatibility, save to cache
    saveToCache(CACHE_CONFIG.TUTORS_CACHE_KEY, data.tutors || [], CACHE_CONFIG.TUTORS_CACHE_TTL);
    
    return data.tutors || [];
  } catch (error) {
    
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
  try {
    localStorage.removeItem(CACHE_CONFIG.TUTORS_CACHE_KEY);
  } catch (error) {
  }
} 