import { saveToCache, getFromCache, CACHE_CONFIG } from './caching';

/**
 * Fetches tutors data with caching support
 * @returns Array of tutors or null if error occurs
 */
export async function fetchTutorsWithCache() {
  try {
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
    const response = await fetch('/api/tutors');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tutors: ${response.statusText}`);
    }
    
    const data = await response.json();
    const tutors = data.tutors || [];
    
    // Save to cache with the longer TTL
    saveToCache(CACHE_CONFIG.TUTORS_CACHE_KEY, tutors, CACHE_CONFIG.TUTORS_CACHE_TTL);
    
    console.log(`${isBackgroundRefresh ? 'Background refresh' : 'Fetched'} and cached ${tutors.length} tutors`);
    
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