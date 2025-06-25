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
    // Prefetch public data even if auth check fails
    prefetchPublicData();
  });
}

/**
 * Prefetch all essential data for authenticated users
 */
async function prefetchAllData(): Promise<void> {
  
  // Get user data to check permissions
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Check if user has premium access or is a tutor
  let hasPremiumAccess = false;
  let isTutor = false;
  
  try {
    // Fetch user data from the database to check access
    if (user?.id) {
      const { data: userData, error } = await supabase
        .from('users')
        .select('is_tutor, has_access')
        .eq('id', user.id)
        .single();
      
      if (!error && userData) {
        hasPremiumAccess = userData.has_access || false;
        isTutor = userData.is_tutor || false;
      }
    }
  } catch (error) {
  }
  
  // Always prefetch these resources for authenticated users
  const prefetchPromises: Promise<unknown>[] = [
    prefetchTutors(),
    prefetchUserProfile()
  ];
  
  // Only prefetch premium resources if user has access or is a tutor
  if (hasPremiumAccess || isTutor) {
    prefetchPromises.push(prefetchConversations());
    prefetchPromises.push(prefetchSessions());
  } else {
  }
  
  // Wait for all prefetch operations to complete
  try {
    await Promise.allSettled(prefetchPromises);
  } catch (error) {
  }
}

/**
 * Prefetch only public data for non-authenticated users
 */
function prefetchPublicData(): void {
  
  // Don't prefetch anything for non-authenticated users
  // The tutors API requires authentication
}

/**
 * Prefetch tutors data
 */
async function prefetchTutors(): Promise<void> {
  
  // Check if we already have cached tutors data
  const cachedTutors = getFromCache(CACHE_CONFIG.TUTORS_CACHE_KEY, CACHE_CONFIG.TUTORS_CACHE_TTL);
  
  // If we have cached data, we can exit early
  if (cachedTutors) {
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
    
  } catch (error) {
  }
}

/**
 * Prefetch user profile data
 */
async function prefetchUserProfile(): Promise<void> {
  
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
    
  } catch (error) {
  }
}

/**
 * Prefetch conversations data
 */
async function prefetchConversations(): Promise<void> {
  
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
        
        if (response.status === 403) {
          return []; // Return empty array instead of throwing
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch conversations: ${response.status}`);
        }
        
        const data = await response.json();
        return data.conversations || [];
      },
      CACHE_CONFIG.CACHE_TTL
    );
    
  } catch (error) {
    // Log but don't rethrow - this prevents unhandled promise rejections
  }
}

/**
 * Prefetch tutoring sessions data
 */
async function prefetchSessions(): Promise<void> {
  
  try {
    await getAndCacheData(
      CACHE_CONFIG.SESSIONS_CACHE_KEY,
      async () => {
        // Get the user ID first
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        
        if (!userId) {
          return []; // Return empty array instead of throwing
        }
        
        // Include user_id and user_type parameters
        const response = await fetch(`/api/tutoring-sessions?user_id=${userId}&user_type=${userData.user?.user_metadata?.is_tutor ? 'tutor' : 'student'}`, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        if (response.status === 403) {
          return []; // Return empty array instead of throwing
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tutoring sessions: ${response.status}`);
        }
        
        const responseData = await response.json();
        return responseData.sessions || [];
      },
      CACHE_CONFIG.CACHE_TTL
    );
    
  } catch (error) {
    // Log but don't rethrow - this prevents unhandled promise rejections
  }
}

/**
 * Prefetch messages for a specific conversation
 * @param conversationId The ID of the conversation to prefetch messages for
 */
export async function prefetchMessages(conversationId: string): Promise<void> {
  
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
    
  } catch (error) {
  }
}

/**
 * Prefetch reviews for a specific tutor
 * @param tutorId The ID of the tutor to prefetch reviews for
 */
export async function prefetchTutorReviews(tutorId: string): Promise<void> {
  
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
    
  } catch (error) {
  }
} 