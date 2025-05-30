import { 
  CACHE_CONFIG, 
  initCachingSystem, 
  getAndCacheData,
  getFromCache
} from './caching';
import { createClient } from '@/utils/supabase/client';

/**
 * Initialize the cache system and prefetch essential data
 * Call this function when the application loads
 */
export function initializeCache(): void {
  // Initialize the caching system
  initCachingSystem();
  
  // Check if user is authenticated before prefetching data
  const supabase = createClient();
  
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) {
      // User is authenticated, prefetch all essential data
      prefetchAllData();
    } else {
      // User is not authenticated, only prefetch public data
      prefetchPublicData();
    }
  }).catch(error => {
    console.error('Error checking authentication status:', error);
    // Prefetch public data even if auth check fails
    prefetchPublicData();
  });
}

/**
 * Prefetch all essential data for authenticated users
 */
async function prefetchAllData(): Promise<void> {
  console.debug('Prefetching all data for authenticated user');
  
  // Start all prefetch operations in parallel
  const prefetchPromises: Promise<unknown>[] = [
    prefetchTutors(),
    prefetchUserProfile(),
    prefetchConversations(),
    prefetchSessions()
  ];
  
  // Wait for all prefetch operations to complete
  try {
    await Promise.allSettled(prefetchPromises);
    console.debug('All data prefetched successfully');
  } catch (error) {
    console.error('Error prefetching data:', error);
  }
}

/**
 * Prefetch only public data for non-authenticated users
 */
function prefetchPublicData(): void {
  console.debug('Prefetching public data for non-authenticated user');
  
  // Don't prefetch anything for non-authenticated users
  // The tutors API requires authentication
  console.debug('No data to prefetch for non-authenticated users');
}

/**
 * Prefetch tutors data
 */
async function prefetchTutors(): Promise<void> {
  console.debug('Prefetching tutors data');
  
  // Check if we already have cached tutors data
  const cachedTutors = getFromCache(CACHE_CONFIG.TUTORS_CACHE_KEY, CACHE_CONFIG.TUTORS_CACHE_TTL);
  
  // If we have cached data, we can exit early
  if (cachedTutors) {
    console.debug('Using cached tutors data');
    return;
  }
  
  try {
    await getAndCacheData(
      CACHE_CONFIG.TUTORS_CACHE_KEY,
      async () => {
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
        return data.tutors || [];
      },
      CACHE_CONFIG.TUTORS_CACHE_TTL
    );
    
    console.debug('Tutors data prefetched and cached');
  } catch (error) {
    console.error('Error prefetching tutors:', error);
  }
}

/**
 * Prefetch user profile data
 */
async function prefetchUserProfile(): Promise<void> {
  console.debug('Prefetching user profile data');
  
  try {
    await getAndCacheData(
      CACHE_CONFIG.USER_PROFILE_CACHE_KEY,
      async () => {
        // Get user ID from session
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        const response = await fetch(`/api/users/profile/${userId}`, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user profile: ${response.status}`);
        }
        
        const profileData = await response.json();
        return profileData.user || null;
      },
      CACHE_CONFIG.USER_PROFILE_CACHE_TTL
    );
    
    console.debug('User profile data prefetched and cached');
  } catch (error) {
    console.error('Error prefetching user profile:', error);
  }
}

/**
 * Prefetch conversations data
 */
async function prefetchConversations(): Promise<void> {
  console.debug('Prefetching conversations data');
  
  try {
    await getAndCacheData(
      CACHE_CONFIG.CONVERSATIONS_CACHE_KEY,
      async () => {
        const response = await fetch('/api/conversations', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch conversations: ${response.status}`);
        }
        
        const data = await response.json();
        return data.conversations || [];
      },
      CACHE_CONFIG.CACHE_TTL
    );
    
    console.debug('Conversations data prefetched and cached');
  } catch (error) {
    console.error('Error prefetching conversations:', error);
  }
}

/**
 * Prefetch tutoring sessions data
 */
async function prefetchSessions(): Promise<void> {
  console.debug('Prefetching tutoring sessions data');
  
  try {
    await getAndCacheData(
      CACHE_CONFIG.SESSIONS_CACHE_KEY,
      async () => {
        // Get the user ID first
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        // Include user_id and user_type parameters
        const response = await fetch(`/api/tutoring-sessions?user_id=${userId}&user_type=${userData.user?.user_metadata?.is_tutor ? 'tutor' : 'student'}`, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tutoring sessions: ${response.status}`);
        }
        
        const responseData = await response.json();
        return responseData.sessions || [];
      },
      CACHE_CONFIG.CACHE_TTL
    );
    
    console.debug('Tutoring sessions data prefetched and cached');
  } catch (error) {
    console.error('Error prefetching tutoring sessions:', error);
  }
}

/**
 * Prefetch messages for a specific conversation
 * @param conversationId The ID of the conversation to prefetch messages for
 */
export async function prefetchMessages(conversationId: string): Promise<void> {
  console.debug(`Prefetching messages for conversation ${conversationId}`);
  
  const cacheKey = `${CACHE_CONFIG.MESSAGES_CACHE_PREFIX}${conversationId}`;
  
  try {
    await getAndCacheData(
      cacheKey,
      async () => {
        const response = await fetch(`/api/messages?conversationId=${conversationId}`, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.status}`);
        }
        
        const data = await response.json();
        return data.messages || [];
      },
      CACHE_CONFIG.CACHE_TTL
    );
    
    console.debug(`Messages for conversation ${conversationId} prefetched and cached`);
  } catch (error) {
    console.error(`Error prefetching messages for conversation ${conversationId}:`, error);
  }
}

/**
 * Prefetch reviews for a specific tutor
 * @param tutorId The ID of the tutor to prefetch reviews for
 */
export async function prefetchTutorReviews(tutorId: string): Promise<void> {
  console.debug(`Prefetching reviews for tutor ${tutorId}`);
  
  const cacheKey = `${CACHE_CONFIG.REVIEWS_CACHE_PREFIX}${tutorId}`;
  
  try {
    await getAndCacheData(
      cacheKey,
      async () => {
        const response = await fetch(`/api/reviews/tutor/${tutorId}`, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tutor reviews: ${response.status}`);
        }
        
        const data = await response.json();
        return data.reviews || [];
      },
      CACHE_CONFIG.REVIEWS_CACHE_TTL
    );
    
    console.debug(`Reviews for tutor ${tutorId} prefetched and cached`);
  } catch (error) {
    console.error(`Error prefetching reviews for tutor ${tutorId}:`, error);
  }
} 