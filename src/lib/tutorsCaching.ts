import { saveToCache, getFromCache, CACHE_CONFIG, invalidateCache } from './caching';
import { createClient } from '@supabase/supabase-js';

/**
 * Check if the user is authenticated
 * @returns Promise<boolean> Whether the user is authenticated
 */
async function isAuthenticated(): Promise<boolean> {
  try {
    // Use the session API to check authentication instead of direct Supabase calls
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      credentials: 'include' // Important: include credentials to send cookies
    });
    
    if (!response.ok) {
      console.log('Auth check failed, clearing tutor cache');
      invalidateCache(CACHE_CONFIG.TUTORS_CACHE_KEY);
      return false;
    }
    
    const data = await response.json();
    
    if (!data.user) {
      console.log('No authenticated user found, clearing tutor cache');
      invalidateCache(CACHE_CONFIG.TUTORS_CACHE_KEY);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking authentication:', error);
    invalidateCache(CACHE_CONFIG.TUTORS_CACHE_KEY);
    return false;
  }
}

/**
 * Fetches tutors data with caching support
 * @returns Array of tutors or null if error occurs
 */
export async function fetchTutorsWithCache() {
  try {
    // First verify the user is authenticated
    const authenticated = await isAuthenticated();
    
    if (!authenticated) {
      console.log('User not authenticated, forcing API fetch');
      invalidateCache(CACHE_CONFIG.TUTORS_CACHE_KEY);
      return await fetchTutorsFromAPI();
    }
    
    // Try to get tutors from cache first
    const cachedTutors = getFromCache(
      CACHE_CONFIG.TUTORS_CACHE_KEY, 
      CACHE_CONFIG.TUTORS_CACHE_TTL
    );
    
    if (cachedTutors) {
      console.log('Using cached tutors data');
      
      // If we have cache, trigger background refresh
      // but don't wait for it to complete
      setTimeout(() => {
        fetchTutorsFromAPI(true);
      }, 100);
      
      return cachedTutors;
    }
    
    // No cache available, fetch from API immediately
    return await fetchTutorsFromAPI();
  } catch (error) {
    console.error('Error fetching tutors with cache:', error);
    return null;
  }
}

/**
 * Fetches tutors directly from the API
 * @param isBackgroundRefresh Whether this is a background refresh (won't throw errors)
 * @returns Array of tutors or null if error occurs
 */
export async function fetchTutorsFromAPI(isBackgroundRefresh = false) {
  try {
    // First check if user is authenticated before making the request
    if (!isBackgroundRefresh) {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        console.log('User not authenticated, cannot fetch tutors');
        return null;
      }
    }
    
    const response = await fetch('/api/tutors');
    
    if (!response.ok) {
      // If unauthorized (401) or forbidden (403), clear the cache
      if (response.status === 401 || response.status === 403) {
        invalidateCache(CACHE_CONFIG.TUTORS_CACHE_KEY);
        console.log('Unauthorized access, cleared tutor cache');
        return null;
      }
      
      throw new Error(`Failed to fetch tutors: ${response.statusText}`);
    }
    
    const data = await response.json();
    const tutors = data.tutors || [];
    
    // Verify user is still authenticated before saving to cache
    const isStillAuthenticated = await isAuthenticated();
    if (isStillAuthenticated) {
      // Save to cache with the longer TTL
      saveToCache(CACHE_CONFIG.TUTORS_CACHE_KEY, tutors, CACHE_CONFIG.TUTORS_CACHE_TTL);
      console.log(`${isBackgroundRefresh ? 'Background refresh' : 'Fetched'} and cached ${tutors.length} tutors`);
    } else {
      console.log('User no longer authenticated, not caching tutor data');
    }
    
    return tutors;
  } catch (error) {
    console.error('Error fetching tutors from API:', error);
    if (!isBackgroundRefresh) {
      throw error; // Only rethrow if not a background refresh
    }
    return null;
  }
}

/**
 * Manually invalidates the tutors cache
 * Call this when tutor data changes (new tutor added, etc.)
 */
export function invalidateTutorsCache() {
  try {
    localStorage.removeItem(CACHE_CONFIG.TUTORS_CACHE_KEY);
    console.log('Tutors cache invalidated');
  } catch (error) {
    console.warn('Failed to invalidate tutors cache:', error);
  }
} 