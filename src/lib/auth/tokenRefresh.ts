import { createClient } from '@/utils/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Enable verbose debugging for token refresh operations
 * Set to false in production
 */
const VERBOSE_LOGGING = true;

/**
 * Amount of time (in minutes) before token expiration when we should refresh
 * Setting this to 10 means tokens will refresh when they have less than 10 minutes left
 */
const REFRESH_THRESHOLD_MINUTES = 10;

/**
 * Minimum interval (in milliseconds) between refresh attempts to prevent excessive API calls
 */
const MIN_REFRESH_INTERVAL = 60000; // 1 minute

/**
 * Default refresh interval when token expiry can't be determined 
 */
const DEFAULT_REFRESH_INTERVAL = 30 * 60000; // 30 minutes

// Track when the last refresh was attempted
let lastRefreshAttempt = 0;

// Track if a refresh is currently in progress
let refreshInProgress = false;

// Track the refresh timer ID
let refreshTimerId: ReturnType<typeof setTimeout> | null = null;

/**
 * Log debug information about token refreshing
 */
function logTokenDebug(message: string, data?: any): void {
  if (!VERBOSE_LOGGING) return;
  
  if (data) {
    console.info(`[TokenRefresh] ${message}`, data);
  } else {
    console.info(`[TokenRefresh] ${message}`);
  }
}

/**
 * Log token expiration details for diagnostics
 * @param token The JWT token to diagnose
 * @param expiresAt Optional explicit expiration time
 */
export function logTokenExpiration(token: string, expiresAt?: number): void {
  if (!VERBOSE_LOGGING) return;
  
  try {
    const expiry = expiresAt || getTokenExpiry(token);
    if (!expiry) {
      return;
    }
    
    const now = Date.now();
    const timeRemaining = expiry - now;
    
    // Convert to readable time
    const seconds = Math.floor(timeRemaining / 1000) % 60;
    const minutes = Math.floor(timeRemaining / (1000 * 60)) % 60;
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    
    if (timeRemaining < 0) {
      const expiredAgo = Math.abs(timeRemaining);
      const expiredSeconds = Math.floor(expiredAgo / 1000) % 60;
      const expiredMinutes = Math.floor(expiredAgo / (1000 * 60)) % 60;
      const expiredHours = Math.floor(expiredAgo / (1000 * 60 * 60));
      
      logTokenDebug(
        `[TokenRefresh] Token has expired ${expiredHours}h ${expiredMinutes}m ${expiredSeconds}s ago`,
        {
          now: new Date(now).toISOString(),
          expiry: new Date(expiry).toISOString(),
          expiredAgo: Math.floor(expiredAgo / 1000) + ' seconds'
        }
      );
    } else {
      logTokenDebug(
        `[TokenRefresh] Token expires in ${hours}h ${minutes}m ${seconds}s`,
        {
          now: new Date(now).toISOString(),
          expiry: new Date(expiry).toISOString(),
          timeRemaining: Math.floor(timeRemaining / 1000) + ' seconds'
        }
      );
    }
  } catch (err) {
  }
}

/**
 * Parse JWT token to get expiration time
 * @param token JWT token string
 * @returns Expiration time in milliseconds or null if parsing fails
 */
export function getTokenExpiry(token: string): number | null {
  try {
    // Extract the payload part of the token (second part)
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    // Convert base64url to regular base64
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode and parse JSON
    const payload = JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    );
    
    // Get expiration timestamp in milliseconds
    return payload.exp ? payload.exp * 1000 : null;
  } catch (err) {
    return null;
  }
}

/**
 * Calculate time remaining until token expires
 * @param expiryTime Token expiration timestamp in milliseconds
 * @returns Time remaining in milliseconds
 */
export function getTimeUntilExpiry(expiryTime: number): number {
  const now = Date.now();
  return Math.max(0, expiryTime - now);
}

/**
 * Check if token should be refreshed based on remaining time
 * @param expiryTime Token expiration timestamp in milliseconds
 * @returns True if token should be refreshed, false otherwise
 */
export function shouldRefreshToken(expiryTime: number): boolean {
  const timeRemaining = getTimeUntilExpiry(expiryTime);
  const thresholdMs = REFRESH_THRESHOLD_MINUTES * 60 * 1000;
  return timeRemaining < thresholdMs;
}

/**
 * Get optimal refresh timer interval based on token expiry
 * @param expiryTime Token expiration timestamp in milliseconds
 * @returns Interval in milliseconds when the next refresh should happen
 */
export function getRefreshInterval(expiryTime: number | null): number {
  if (!expiryTime) return DEFAULT_REFRESH_INTERVAL;
  
  const timeRemaining = getTimeUntilExpiry(expiryTime);
  const thresholdMs = REFRESH_THRESHOLD_MINUTES * 60 * 1000;
  
  // If expiring soon, refresh immediately (return 0)
  if (timeRemaining <= thresholdMs) {
    return 0;
  }
  
  // Set next check to happen right before the refresh threshold
  // Subtract threshold from time remaining, then subtract 30 seconds for safety margin
  return timeRemaining - thresholdMs - 30000;
}

/**
 * Refresh the authentication token if needed
 * @param client Optional Supabase client instance
 * @returns Promise resolving to true if refresh was successful or not needed, false otherwise
 */
export async function refreshTokenIfNeeded(client?: SupabaseClient): Promise<boolean> {
  // Prevent multiple simultaneous refresh attempts
  if (refreshInProgress) {
    logTokenDebug('Refresh already in progress, skipping');
    return true;
  }
  
  const now = Date.now();
  
  // Don't refresh too frequently
  if (now - lastRefreshAttempt < MIN_REFRESH_INTERVAL) {
    logTokenDebug('Refresh attempted too soon after previous attempt, skipping');
    return true;
  }
  
  try {
    refreshInProgress = true;
    lastRefreshAttempt = now;
    
    // Use provided client or create a new one
    const supabase = client || createClient();
    
    // Check if we have a session with a token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return false;
    }
    
    if (!sessionData.session?.access_token) {
      logTokenDebug('No access token found in session');
      return false;
    }
    
    const token = sessionData.session.access_token;
    
    // Calculate token expiry (if not present in the session)
    const expiryTime = sessionData.session.expires_at 
      ? sessionData.session.expires_at * 1000
      : getTokenExpiry(token);
    
    // Log token expiration details
    if (VERBOSE_LOGGING) {
      logTokenExpiration(token, expiryTime || undefined);
    }
    
    if (!expiryTime) {
      logTokenDebug('Could not determine token expiry, refreshing as precaution');
      // If we can't determine expiry, refresh as a precaution
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        return false;
      }
      
      logTokenDebug('Session refreshed successfully (precautionary)');
      return true;
    }
    
    // Only refresh if needed
    if (shouldRefreshToken(expiryTime)) {
      logTokenDebug('Token needs refreshing, proceeding with refresh');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        return false;
      }
      
      // Log new token details
      if (VERBOSE_LOGGING && data.session.access_token) {
        logTokenDebug('New token information after refresh:');
        logTokenExpiration(data.session.access_token, data.session.expires_at ? data.session.expires_at * 1000 : undefined);
      }
      
      logTokenDebug('Session refreshed successfully');
      return true;
    }
    
    // Token doesn't need refreshing yet
    logTokenDebug('Token is still valid, no refresh needed');
    return true;
  } catch (err) {
    return false;
  } finally {
    refreshInProgress = false;
  }
}

/**
 * Start automatic token refresh
 * @returns Function to stop automatic refreshing
 */
export function startTokenRefreshTimer(): () => void {
  // Clear any existing timer
  stopTokenRefreshTimer();
  
  const checkAndRefresh = async () => {
    const supabase = createClient();
    
    try {
      // Check current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session?.access_token) {
        // No valid session, check again in default interval
        refreshTimerId = setTimeout(checkAndRefresh, DEFAULT_REFRESH_INTERVAL);
        return;
      }
      
      // Determine token expiry time
      const expiryTime = sessionData.session.expires_at 
        ? sessionData.session.expires_at * 1000
        : getTokenExpiry(sessionData.session.access_token);
      
      // Refresh the token if needed
      await refreshTokenIfNeeded(supabase);
      
      // Schedule next check based on expiry time
      const interval = getRefreshInterval(expiryTime);
      refreshTimerId = setTimeout(checkAndRefresh, interval);
    } catch (err) {
      // If error occurs, try again in default interval
      refreshTimerId = setTimeout(checkAndRefresh, DEFAULT_REFRESH_INTERVAL);
    }
  };
  
  // Start the refresh cycle immediately
  checkAndRefresh();
  
  return stopTokenRefreshTimer;
}

/**
 * Stop automatic token refresh
 */
export function stopTokenRefreshTimer(): void {
  if (refreshTimerId !== null) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
}

/**
 * Initialize the token refresh system
 */
export function initializeTokenRefresh(): () => void {
  // Start token refresh when window is in focus
  const startRefreshOnFocus = () => {
    if (document.visibilityState === 'visible') {
      refreshTokenIfNeeded();
    }
  };
  
  // Set up event listeners
  document.addEventListener('visibilitychange', startRefreshOnFocus);
  window.addEventListener('focus', () => refreshTokenIfNeeded());
  
  // Start automatic refreshing
  const stopRefreshTimer = startTokenRefreshTimer();
  
  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', startRefreshOnFocus);
    window.removeEventListener('focus', () => refreshTokenIfNeeded());
    stopRefreshTimer();
  };
} 