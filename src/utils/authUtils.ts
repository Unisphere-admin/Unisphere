import { createClient } from './supabase/client';
import { invalidateCache, CACHE_CONFIG } from '@/lib/caching';

/**
 * Checks if the user is authenticated and clears tutor cache if not
 * @returns Promise<boolean> - Whether the user is authenticated
 */
export async function checkAuthAndClearCacheIfNeeded(): Promise<boolean> {
  try {
    // Use the singleton client instead of creating a new one
    const supabase = createClient();
    
    // Check authentication status
    const { data, error } = await supabase.auth.getUser();
    
    // If not authenticated, clear tutors cache
    if (error || !data.user) {
      console.log('User not authenticated, clearing tutor cache');
      invalidateCache(CACHE_CONFIG.TUTORS_CACHE_KEY);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error checking authentication status:', err);
    // Clear cache on error to be safe
    invalidateCache(CACHE_CONFIG.TUTORS_CACHE_KEY);
    return false;
  }
}

/**
 * This function is called on application startup to ensure
 * no cached tutor data is accessible to unauthenticated users
 */
export function setupAuthCacheCheck() {
  // Check immediately on page load
  checkAuthAndClearCacheIfNeeded();
  
  // Check whenever the page visibility changes (user returns to app)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkAuthAndClearCacheIfNeeded();
    }
  });
  
  // Setup periodic check every 5 minutes
  setInterval(checkAuthAndClearCacheIfNeeded, 5 * 60 * 1000);
} 