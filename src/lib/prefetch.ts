import { createClient } from '@/utils/supabase/client';
import { saveToCache, getFromCache, CACHE_CONFIG } from './caching';

interface Conversation {
  id: string;
  unreadCount?: number;
  last_message?: {
    created_at?: string;
    id: string;
    content: string;
    sender_id: string;
  };
  participants?: Array<{
    user_id: string;
    last_viewed_at?: string | null;
    user?: {
      id: string;
      display_name?: string;
      avatar_url?: string | null;
      is_tutor?: boolean;
    };
  }>;
}

/**
 * Checks if the user has premium access or is a tutor
 * @returns boolean indicating if user has access to premium features
 */
async function checkUserHasPremiumAccess(): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }
    
    // Get user data including is_tutor and has_access flags
    const { data: userData, error } = await supabase
      .from('users')
      .select('is_tutor, has_access')
      .eq('id', user.id)
      .single();
    
    if (error) {
      return false;
    }
    
    // User has access if they are a tutor OR have premium access
    return userData?.is_tutor === true || userData?.has_access === true;
  } catch (error) {
    return false;
  }
}

/**
 * Prefetches user conversations and caches them
 * This can be called on app initialization when user logs in
 * @param forceRefresh Whether to force refresh and override cache
 */
export async function prefetchUserConversations(forceRefresh: boolean = true): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }
    
    // Check if user has premium access
    const hasPremiumAccess = await checkUserHasPremiumAccess();
    if (!hasPremiumAccess) {
      return false;
    }
    
    
    // Fetch conversations
    const response = await fetch('/api/conversations');
    
    // Handle 403 Forbidden (access denied) responses
    if (response.status === 403) {
      return false;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to prefetch conversations: ${response.statusText}`);
    }
    
    const data = await response.json();
    const conversations: Conversation[] = data.conversations || [];
    
    // Save to cache
    saveToCache(CACHE_CONFIG.CONVERSATIONS_CACHE_KEY, conversations);
    
    
    // Prioritize conversations for message fetching
    const conversationsToFetch: Conversation[] = [];
    
    // First add conversations with unread messages
    const unreadConversations = conversations.filter((c: Conversation) => c.unreadCount && c.unreadCount > 0);
    conversationsToFetch.push(...unreadConversations);
    
    // Then add the most recent conversations (that aren't already included)
    const recentConversations = conversations
      .sort((a: Conversation, b: Conversation) => {
        const aTime = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
        const bTime = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
        return bTime - aTime; // Most recent first
      })
      .filter((c: Conversation) => !conversationsToFetch.find(uc => uc.id === c.id))
      .slice(0, 5); // Get top 5 most recent
      
    conversationsToFetch.push(...recentConversations);
    
    // Limit the total number of fetches to avoid excessive API calls
    const fetchLimit = Math.min(conversationsToFetch.length, 10);
    
    
    // Use Promise.all to fetch all conversations in parallel
    await Promise.all(
      conversationsToFetch.slice(0, fetchLimit).map(conversation => 
        prefetchMessagesForConversation(conversation.id, false, forceRefresh)
      )
    );
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Prefetches messages for a specific conversation
 * @param conversationId The conversation ID to prefetch messages for
 * @param markAsRead Whether to mark the conversation as read (defaults to false)
 * @param forceRefresh Whether to force refresh and override cache
 */
export async function prefetchMessagesForConversation(
  conversationId: string, 
  markAsRead: boolean = false,
  forceRefresh: boolean = true
): Promise<boolean> {
  try {
    // Check if user has premium access
    const hasPremiumAccess = await checkUserHasPremiumAccess();
    if (!hasPremiumAccess) {
      return false;
    }
    
    // Check if we already have cached data
    const cacheKey = `${CACHE_CONFIG.MESSAGES_CACHE_PREFIX}${conversationId}`;
    const cachedMessages = getFromCache(cacheKey);
    
    // If we have a cache and we're not forcing a refresh, use the cache
    if (cachedMessages && !forceRefresh) {
      const cacheItem = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      const now = Date.now();
      const cacheAge = now - (cacheItem.timestamp || 0);
      
      
      // If markAsRead is true, still mark as read even when using cache
      if (markAsRead) {
        await markConversationAsRead(conversationId);
      }
      
      return true;
    }
    
    
    // Fetch messages with a limit of 50 to ensure we get enough message history
    const response = await fetch(`/api/messages?conversation_id=${conversationId}&limit=50`);
    
    // Handle 403 Forbidden (access denied) responses - the user doesn't have premium access
    if (response.status === 403) {
      // Store in sessionStorage to avoid repeated requests for this conversation
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(`prefetch_blocked_${conversationId}`, 'true');
      }
      return false;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to prefetch messages: ${response.statusText}`);
    }
    
    const data = await response.json();
    const messages = data.messages || [];
    
    // Save to cache
    saveToCache(cacheKey, messages);
    
    
    // If markAsRead is true, mark the conversation as read
    if (markAsRead) {
      await markConversationAsRead(conversationId);
    }
    
    // Broadcast that new messages are available (for real-time updates in other tabs/windows)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('latest_message', JSON.stringify({
        timestamp: new Date().toISOString(),
        conversationId
      }));
    }
    
    // Update unread counts in the conversations cache
    updateUnreadCountsInCache(conversationId, messages);
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Updates the unread counts in the conversations cache based on message data
 * @param conversationId The conversation ID
 * @param messages The messages to calculate unread counts from
 */
async function updateUnreadCountsInCache(conversationId: string, messages: any[]): Promise<void> {
  try {
    // Get conversations from cache
    const conversations = getFromCache<Conversation[]>(CACHE_CONFIG.CONVERSATIONS_CACHE_KEY);
    if (!conversations) return;

    // Get the current user
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Find the conversation in cache
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    // Get current user's last viewed timestamp
    const currentUserParticipant = conversation.participants?.find(p => p.user_id === user.id);
    const lastViewedAt = currentUserParticipant?.last_viewed_at;

    // Calculate unread count
    let unreadCount = 0;
    
    if (messages && messages.length > 0) {
      if (!lastViewedAt) {
        // If no last_viewed_at, count all messages from others as unread
        unreadCount = messages.filter(msg => msg.sender_id !== user.id).length;
      } else {
        // Count messages after last_viewed_at from others
        const lastViewedTime = new Date(lastViewedAt).getTime();
        unreadCount = messages.filter(msg => {
          const messageTime = new Date(msg.created_at || msg.timestamp).getTime();
          return messageTime > lastViewedTime && msg.sender_id !== user.id;
        }).length;
      }
    }
    
    // Update the unread count in the conversation
    conversation.unreadCount = unreadCount;
    
    // Save updated conversations back to cache
    saveToCache(CACHE_CONFIG.CONVERSATIONS_CACHE_KEY, conversations);
    
  } catch (error) {
  }
}

/**
 * Mark a conversation as read
 * @param conversationId The conversation ID to mark as read
 */
async function markConversationAsRead(conversationId: string): Promise<boolean> {
  try {
    
    const response = await fetch(`/api/conversations/${conversationId}/mark-read`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to mark conversation as read: ${response.statusText}`);
    }
    
    // Update unread count in cache
    const conversations = getFromCache<Conversation[]>(CACHE_CONFIG.CONVERSATIONS_CACHE_KEY);
    if (conversations) {
      const updatedConversations = conversations.map(convo => 
        convo.id === conversationId ? { ...convo, unreadCount: 0 } : convo
      );
      saveToCache(CACHE_CONFIG.CONVERSATIONS_CACHE_KEY, updatedConversations);
    }
    
    const data = await response.json();
    
    return true;
  } catch (error) {
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
  
  // Check if this is a genuine page load or just a tab refocus
  // We use sessionStorage to track if we've already prefetched in this session
  const alreadyPrefetched = sessionStorage.getItem('prefetchedThisSession');
  
  if (alreadyPrefetched === 'true') {
    // Skip prefetching if we've already done it in this session (tab refocus)
    return;
  }
  
  // Check if user is active before prefetching
  const prefetch = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if the user has premium access before prefetching
      const hasPremiumAccess = await checkUserHasPremiumAccess();
      
      if (hasPremiumAccess) {
        
        // Force refresh to override cache on initial load
        await prefetchUserConversations(true);
        
        // Mark that we've prefetched in this session
        sessionStorage.setItem('prefetchedThisSession', 'true');
        
      } else {
      }
    } else {
    }
  };
  
  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => prefetch(), { timeout: 2000 });
  } else {
    setTimeout(prefetch, 1000);
  }
}

/**
 * Resets prefetch status - call this when user logs out or manually refreshes data
 * This allows prefetching to run again on the next page load
 */
export function resetPrefetchStatus() {
  if (typeof window === 'undefined') return;
  
  try {
    // Remove the prefetch flag from session storage
    sessionStorage.removeItem('prefetchedThisSession');
  } catch (error) {
  }
} 