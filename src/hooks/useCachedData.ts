import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getFromCache,
  getAndCacheData,
  CACHE_CONFIG,
  isCacheLoading
} from '@/lib/caching';

/**
 * Custom hook to retrieve and manage cached data
 * 
 * @param cacheKey The key to store the data under in cache
 * @param fetchFn Function to fetch the data when needed
 * @param ttl Optional TTL for the cache (in milliseconds)
 * @param options Additional options
 * @returns Object containing data, loading state, error, and refresh function
 */
export function useCachedData<T = any>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl?: number,
  options: {
    initialFetchDelay?: number;
    disableBackgroundRefresh?: boolean;
    dependencyArray?: any[];
  } = {}
) {
  const {
    initialFetchDelay = 0,
    disableBackgroundRefresh = false,
    dependencyArray = [],
  } = options;

  // Use ref to track mount state to prevent refresh loops
  const isMounted = useRef(false);
  const refreshInProgress = useRef(false);

  // Try to get initial data from cache immediately
  const initialCachedData = getFromCache<T>(cacheKey, ttl);
  
  const [data, setData] = useState<T | null>(initialCachedData);
  const [isLoading, setIsLoading] = useState<boolean>(!initialCachedData || isCacheLoading(cacheKey));
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Function to refresh data
  const refresh = useCallback(async (force: boolean = false) => {
    // Prevent concurrent refreshes
    if (refreshInProgress.current) return data;
    
    refreshInProgress.current = true;
    setError(null);
    
    // Only set loading to true if we don't already have data to show
    if (!data) {
      setIsLoading(true);
    }
    
    try {
      const result = await getAndCacheData<T>(
        cacheKey,
        fetchFn,
        ttl,
        {
          forceRefresh: force,
          backgroundRefresh: !disableBackgroundRefresh
        }
      );
      
      setData(result);
      setLastUpdated(new Date().toISOString());
      return result;
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error(String(err));
      setError(fetchError);
      console.error(`Error fetching data for ${cacheKey}:`, fetchError);
      return data; // Return existing data on error instead of null
    } finally {
      setIsLoading(false);
      refreshInProgress.current = false;
    }
  }, [cacheKey, fetchFn, ttl, disableBackgroundRefresh, data]);

  // Initialize from cache
  useEffect(() => {
    // Get cache item to check its age
    try {
      const cacheItemStr = localStorage.getItem(cacheKey);
      if (cacheItemStr) {
        const cacheItem = JSON.parse(cacheItemStr);
        
        // Update last updated timestamp from cache
        if (cacheItem.lastUpdated) {
          setLastUpdated(cacheItem.lastUpdated);
        }
      }
    } catch (err) {
      console.warn(`Error checking cache data for ${cacheKey}:`, err);
    }
  }, [cacheKey]); // Only run on cacheKey change

  // Effect for background refresh - separate to avoid interference
  useEffect(() => {
    // Skip if refresh is disabled or already in progress
    if (disableBackgroundRefresh || refreshInProgress.current) return;

    // Evaluate cache staleness
    try {
      const cacheItemStr = localStorage.getItem(cacheKey);
      if (cacheItemStr) {
        const cacheItem = JSON.parse(cacheItemStr);
        const now = Date.now();
        const cacheAge = now - (cacheItem.timestamp || 0);
        const maxAge = ttl || CACHE_CONFIG.CACHE_TTL;
        
        // If cache is stale, refresh in background - but with shorter delay to avoid race conditions
        if (cacheAge > maxAge) {
          
          const timer = setTimeout(() => {
            if (!refreshInProgress.current) {
              // Don't set loading state for background refreshes
              refresh(false).catch(console.error);
            }
          }, 300); // Reduced delay for background refresh
          
          return () => clearTimeout(timer);
        }
      }
    } catch (err) {
      console.warn(`Error checking cache age for ${cacheKey}:`, err);
    }
  }, [cacheKey, ttl, refresh, disableBackgroundRefresh]);

  // Effect to fetch if no cache is available or on dependency changes
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      
      // If we don't have data from cache, fetch immediately with a minimal delay
      if (!data && !isLoading && !refreshInProgress.current) {
        const timer = setTimeout(() => {
          refresh(false).catch(console.error);
        }, data ? initialFetchDelay : 100); // Shorter delay when no data exists
        
        return () => clearTimeout(timer);
      }
      
      return;
    }
    
    // Only trigger refresh when dependencies change and component is already mounted
    if (!refreshInProgress.current) {
      const timer = setTimeout(() => {
        refresh(false).catch(console.error);
      }, initialFetchDelay);
      
      return () => clearTimeout(timer);
    }
  }, [cacheKey, ttl, refresh, initialFetchDelay, isLoading, data, ...dependencyArray]);

  return {
    data,
    isLoading,
    error,
    refresh,
    lastUpdated
  };
}

/**
 * Custom hook to retrieve and manage cached tutors data
 */
export function useCachedTutors() {
  return useCachedData(
    CACHE_CONFIG.TUTORS_CACHE_KEY,
    async () => {
      const response = await fetch('/api/tutors', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tutors: ${response.status}`);
      }
      
      const data = await response.json();
      return data.tutors || [];
    },
    CACHE_CONFIG.TUTORS_CACHE_TTL
  );
}

/**
 * Custom hook to retrieve and manage cached conversations data
 */
export function useCachedConversations() {
  return useCachedData(
    CACHE_CONFIG.CONVERSATIONS_CACHE_KEY,
    async () => {
      const response = await fetch('/api/conversations', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }
      
      const data = await response.json();
      return data.conversations || [];
    },
    CACHE_CONFIG.CACHE_TTL
  );
}

/**
 * Custom hook to retrieve and manage cached messages for a conversation
 */
export function useCachedMessages(conversationId: string | null) {
  const cacheKey = conversationId 
    ? `${CACHE_CONFIG.MESSAGES_CACHE_PREFIX}${conversationId}`
    : '';
  
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return [];
    
    const response = await fetch(`/api/messages?conversationId=${conversationId}`, {
      credentials: 'include',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.status}`);
    }
    
    const data = await response.json();
    return data.messages || [];
  }, [conversationId]);
  
  return useCachedData(
    cacheKey,
    fetchMessages,
    CACHE_CONFIG.CACHE_TTL,
    { dependencyArray: [conversationId] }
  );
}

/**
 * Custom hook to retrieve and manage cached tutor reviews
 */
export function useCachedTutorReviews(tutorId: string | null) {
  const cacheKey = tutorId 
    ? `${CACHE_CONFIG.REVIEWS_CACHE_PREFIX}${tutorId}`
    : '';
  
  const fetchReviews = useCallback(async () => {
    if (!tutorId) return [];
    
    const response = await fetch(`/api/reviews/tutor/${tutorId}`, {
      credentials: 'include',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tutor reviews: ${response.status}`);
    }
    
    const data = await response.json();
    return data.reviews || [];
  }, [tutorId]);
  
  return useCachedData(
    cacheKey,
    fetchReviews,
    CACHE_CONFIG.REVIEWS_CACHE_TTL,
    { dependencyArray: [tutorId] }
  );
}

/**
 * Custom hook to retrieve and manage cached tutoring sessions
 */
export function useCachedSessions() {
  return useCachedData(
    CACHE_CONFIG.SESSIONS_CACHE_KEY,
    async () => {
      const response = await fetch('/api/tutoring-sessions', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tutoring sessions: ${response.status}`);
      }
      
      const data = await response.json();
      return data.sessions || [];
    },
    CACHE_CONFIG.CACHE_TTL
  );
} 