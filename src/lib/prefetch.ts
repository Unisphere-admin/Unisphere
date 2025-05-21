import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { saveToCache, getFromCache, CACHE_CONFIG } from './caching';

/**
 * Prefetches user conversations and caches them
 * This can be called on app initialization or when user logs in
 */
export async function prefetchUserConversations(): Promise<boolean> {
  try {
    const supabase = createClientComponentClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }
    
    console.log('Prefetching conversations for user');
    
    // Fetch conversations
    const response = await fetch('/api/conversations');
    if (!response.ok) {
      throw new Error(`Failed to prefetch conversations: ${response.statusText}`);
    }
    
    const data = await response.json();
    const conversations = data.conversations || [];
    
    // Save to cache
    saveToCache(CACHE_CONFIG.CONVERSATIONS_CACHE_KEY, conversations);
    
    console.log(`Prefetched and cached ${conversations.length} conversations`);
    
    // Prefetch messages for recent conversations (limit to avoid excessive API calls)
    const recentConversations = conversations.slice(0, 3); // Most recent 3
    
    for (const conversation of recentConversations) {
      await prefetchMessagesForConversation(conversation.id);
    }
    
    return true;
  } catch (error) {
    console.error('Error prefetching conversations:', error);
    return false;
  }
}

/**
 * Prefetches messages for a specific conversation
 * @param conversationId The conversation ID to prefetch messages for
 */
export async function prefetchMessagesForConversation(conversationId: string): Promise<boolean> {
  try {
    // Check if we already have recent cached data
    const cacheKey = `${CACHE_CONFIG.MESSAGES_CACHE_PREFIX}${conversationId}`;
    const cachedMessages = getFromCache(cacheKey);
    
    // If we have recent cache (less than 5 minutes old), don't prefetch again
    if (cachedMessages) {
      const cacheItem = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      const now = Date.now();
      const cacheAge = now - (cacheItem.timestamp || 0);
      
      if (cacheAge < 5 * 60 * 1000) { // 5 minutes
        console.log(`Using existing cache for conversation ${conversationId}, age: ${cacheAge / 1000}s`);
        return true;
      }
    }
    
    console.log(`Prefetching messages for conversation ${conversationId}`);
    
    // Fetch messages
    const response = await fetch(`/api/messages?conversation_id=${conversationId}`);
    if (!response.ok) {
      throw new Error(`Failed to prefetch messages: ${response.statusText}`);
    }
    
    const data = await response.json();
    const messages = data.messages || [];
    
    // Save to cache
    saveToCache(cacheKey, messages);
    
    console.log(`Prefetched and cached ${messages.length} messages for conversation ${conversationId}`);
    return true;
  } catch (error) {
    console.error(`Error prefetching messages for conversation ${conversationId}:`, error);
    return false;
  }
}

/**
 * Initializes prefetching when the app loads
 * Call this function in a top-level component that renders on every page
 */
export function initPrefetching() {
  // Only run in browser
  if (typeof window === 'undefined') return;
  
  // Check if user is active before prefetching
  const prefetch = async () => {
    const supabase = createClientComponentClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      console.log('User is logged in, starting prefetch');
      prefetchUserConversations();
    } else {
      console.log('No logged in user, skipping prefetch');
    }
  };
  
  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => prefetch(), { timeout: 2000 });
  } else {
    setTimeout(prefetch, 1000);
  }
} 