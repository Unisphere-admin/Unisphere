"use client";

import { createContext, useContext, useCallback, ReactNode, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { createClient } from "@/utils/supabase/client";
import { useMessages } from "./MessageContext";
import { useSessions, ActiveSession } from "./SessionContext";
import { toast } from "@/components/ui/sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, MessageSquare, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { refreshTokenIfNeeded } from '@/lib/auth/tokenRefresh';
import { updateCache, updateItemInArrayCache, CACHE_CONFIG } from '@/lib/caching';

// Add this constant near the top of the file, after imports
const VERBOSE_LOGGING = false; // Set to true to enable verbose debug logging

// Define types for realtime events
interface RealtimeMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  conversation_id: string;
  sender?: {
    id: string;
    display_name: string;
    first_name?: string;
    last_name?: string;
    avatar_url: string | null;
    is_tutor: boolean;
  };
}

// Add typing indicator payload interface
interface TypingIndicatorPayload {
  user_id: string;
  conversation_id: string;
  is_typing: boolean;
  display_name?: string;
  timestamp: number;
}

interface RealtimeSession {
  id: string;
  status: string;
  conversation_id: string;
  tutor_ready: boolean;
  student_ready: boolean;
  tutor_id?: string;
  student_id?: string;
  message_id?: string;
  started_at?: string | null;
  ended_at?: string | null;
  scheduled_for?: string | null;
  name?: string | null;
  subject?: string | null;
  cost?: number | null;
  [key: string]: any; // Allow for additional properties
}

// Context interface
interface RealtimeContextType {
  subscribeToConversation: (conversationId: string) => any | null;
  unsubscribeFromConversation: (conversationId: string) => void;
  broadcastMessage: (message: RealtimeMessage) => void;
  broadcastSessionUpdate: (session: RealtimeSession) => void;
  broadcastTypingIndicator: (conversationId: string, isTyping: boolean) => void;
  showNotification: (messageId: string, conversationId: string, senderName: string, senderAvatar: string | null, content: string, isSessionRequest: boolean) => void;
  connected: boolean;
  subscribedChannels: string[];
}

// Create the context
const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

// Provider component
export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const router = useRouter();
  const messageContext = useMessages();
  const sessionContext = useSessions();
  const [connected, setConnected] = useState(false);
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>([]);
  const [hasPremiumAccess, setHasPremiumAccess] = useState<boolean | null>(null);
  
  // Track active subscriptions
  const channelsRef = useRef<{ [key: string]: any }>({});
  const supabaseRef = useRef<any>(null);
  
  // Track recently shown notifications to prevent duplicates
  const recentNotifications = useRef<Map<string, number>>(new Map());
  // Add a cache for sender information
  const senderCache = useRef<Map<string, any>>(new Map());
  const NOTIFICATION_DURATION = 15000; // 15 seconds
  const DUPLICATE_CHECK_WINDOW = 60000; // 60 seconds (was 10 seconds)
  
  // Define the PostgreSQL change payload type
  type PostgresChangePayload = {
    new: {
      id: string;
      participants?: Array<{ user_id: string; [key: string]: any }>;
      [key: string]: any;
    };
    old: Record<string, any> | null;
    [key: string]: any;
  };
  
  // Function to check if a notification has been shown recently
  const hasRecentlyShown = useCallback((messageId: string, conversationId: string, content: string): boolean => {
    const now = Date.now();
    
    // Create a more reliable notification key that includes all relevant info
    const notificationKey = `${messageId}-${conversationId}-${content.substring(0, 30)}`;
    const lastShown = recentNotifications.current.get(notificationKey);
    
    if (!lastShown) return false;
    
    // If shown within last check window, consider it a duplicate
    if (now - lastShown < DUPLICATE_CHECK_WINDOW) {
      return true;
    }
    
    // Clean up old entries to avoid memory leaks
    Array.from(recentNotifications.current.entries()).forEach(([id, timestamp]) => {
      if (now - timestamp > DUPLICATE_CHECK_WINDOW * 2) { // Remove entries older than double the window
        recentNotifications.current.delete(id);
      }
    });
    
    return false;
  }, [DUPLICATE_CHECK_WINDOW]);
  
  // Centralized notification function
  const showNotification = useCallback((
    messageId: string,
    conversationId: string,
    senderName: string,
    senderAvatar: string | null | undefined,
    content: string,
    isSessionRequest: boolean
  ) => {
    // Log notification data for debugging
    const notificationData = {
      messageId,
      conversationId,
      senderName,
      senderAvatar,
      contentPreview: content?.substring(0, 20),
      isSessionRequest
    };
    
    // Skip notifications for the current user's messages
    if (user && messageId.includes(user.id)) {
      return false;
    }
    
    // Skip if we've already shown this notification recently
    if (hasRecentlyShown(messageId, conversationId, content)) {
      return false;
    }
    
    // Check if we're already on the messages page for this conversation
    const isOnMessagesPage = messageContext?.pageVisibility?.isOnMessagesPage || false;
    const selectedConversationId = messageContext?.selectedConversationId || null;
    const pageVisibility = messageContext?.pageVisibility || { isVisible: true, isFocused: true };
    
    // Only skip notifications if ALL of these conditions are true:
    // 1. User is on the messages page
    // 2. This specific conversation is selected
    // 3. The page is visible (not backgrounded)
    // 4. The page has focus (user is actively on this tab)
    if (isOnMessagesPage && 
        selectedConversationId === conversationId && 
        pageVisibility.isVisible && 
        pageVisibility.isFocused) {
      // Mark as read automatically
      messageContext?.markConversationAsRead?.(conversationId);
      return false;
    }
    
    // Try to find a better display name if we have 'Unknown User'
    let displayName = senderName;
    if (!displayName || displayName === 'Unknown User') {
      // Try to find the conversation and get participant info
      if (messageContext?.conversations) {
        const conversation = messageContext.conversations.find(c => c.id === conversationId);
        if (conversation?.participants) {
          const sender = conversation.participants.find(
            p => p.user_id === messageId.split('-')[0] || p.user?.id === messageId.split('-')[0]
          );
          if (sender?.user?.display_name) {
            displayName = sender.user.display_name;
          }
        }
      }
      
      // If we still don't have a good name, use a generic one
      if (!displayName || displayName === 'Unknown User') {
        displayName = 'Someone';
      }
    }
    
    
    // Record this notification to prevent duplicates - use a compound key that includes the content
    // This helps prevent functionally identical notifications
    const notificationKey = `${messageId}-${conversationId}-${content.substring(0, 30)}`;
    recentNotifications.current.set(notificationKey, Date.now());
    
    // Generate a unique ID for this notification to target it specifically
    const toastId = `msg-${messageId}`;
    
    // Create the notification
    toast(
      <div 
        className="flex items-start gap-3 w-full transition-all cursor-pointer"
        onClick={() => {
          // Dismiss the notification when clicked
          toast.dismiss(toastId);
          // Navigate to the conversation
          router.push(`/dashboard/messages?conversationId=${conversationId}`);
        }}
      >
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={senderAvatar || undefined} />
          <AvatarFallback>
            {displayName?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-medium">{displayName}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {isSessionRequest ? 'Sent you a session request' : content}
          </p>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Prevent navigation
            toast.dismiss(toastId); // Dismiss only this notification
          }} 
          className="absolute top-1 right-1 p-1 rounded-full hover:bg-muted/60 z-50"
          aria-label="Close notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>,
      {
        id: toastId,
        duration: NOTIFICATION_DURATION,
        position: "top-right",
        className: "group-[.toaster]:bg-background group-[.toaster]:border-border group-[.toaster]:shadow-lg p-3",
        icon: isSessionRequest ? <Calendar className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />,
      }
    );
    
    return true;
  }, [hasRecentlyShown, messageContext, router, user]);
  
  // Check if user has premium access
  const checkPremiumAccess = useCallback(async () => {
    if (!user) {
      setHasPremiumAccess(false);
      return false;
    }
    
    // Check if we have a recent cached result to avoid unnecessary API calls
    if (hasPremiumAccess !== null) {
      const accessCacheKey = `premium_access_${user.id}`;
      try {
        const cachedAccess = localStorage.getItem(accessCacheKey);
        if (cachedAccess) {
          const { hasAccess, timestamp } = JSON.parse(cachedAccess);
          const now = Date.now();
          // Use cached result if less than 5 minutes old
          if (now - timestamp < 5 * 60 * 1000) {
            setHasPremiumAccess(hasAccess);
            return hasAccess;
          }
        }
      } catch (error) {
        console.warn('Error reading cached premium access:', error);
      }
    }
    
    try {
      // Use the API route instead of direct database access
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        setHasPremiumAccess(false);
        return false;
      }
      
      const data = await response.json();
      
      // User has access if they are a tutor OR have premium access
      const hasAccess = data.user?.role === 'tutor' || data.user?.has_access === true;
      setHasPremiumAccess(hasAccess);
      
      // Cache the result
      if (user.id) {
        try {
          localStorage.setItem(`premium_access_${user.id}`, JSON.stringify({
            hasAccess,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.warn('Error caching premium access:', error);
        }
      }
      
      return hasAccess;
    } catch (error) {
      setHasPremiumAccess(false);
      return false;
    }
  }, [user]);

  // Initialize Supabase client once
  useEffect(() => {
    if (!user) return;
    
    // Check premium access first
    const checkAccess = async () => {
      const hasAccess = await checkPremiumAccess();
      
      // Only initialize Supabase realtime client if user has premium access
      if (hasAccess) {
        // Create Supabase client only once
        if (!supabaseRef.current) {
          supabaseRef.current = createClient();
          setConnected(true);
        }
      } else {
        // Clean up any existing channels when premium access is revoked
        if (supabaseRef.current) {
          // Unsubscribe from all channels
          Object.keys(channelsRef.current).forEach(channelKey => {
            try {
              const channel = channelsRef.current[channelKey];
              if (channel && typeof channel.unsubscribe === 'function') {
                channel.unsubscribe();
              }
            } catch (error) {
            }
          });
          
          // Reset channel references
          channelsRef.current = {};
          setSubscribedChannels([]);
          
          // Disconnect the client
          supabaseRef.current = null;
          setConnected(false);
        }
      }
    };
    
    // Use cached premium access status when available to avoid unnecessary API calls
    if (hasPremiumAccess !== null) {
      if (hasPremiumAccess) {
        // Initialize Supabase client if we know user has access
        if (!supabaseRef.current) {
          supabaseRef.current = createClient();
          setConnected(true);
        }
      }
    } else {
      // Only check premium access if we don't have a cached result
      checkAccess();
    }
    
    return () => {
      // Clean up all channels when unmounting
      Object.values(channelsRef.current).forEach((channel: any) => {
        if (channel?.unsubscribe) {
          channel.unsubscribe();
        }
      });
      
      setSubscribedChannels([]);
      channelsRef.current = {};
    };
  }, [user, checkPremiumAccess, hasPremiumAccess]);

  // Update the function to check if a message has an associated session
  const checkMessageHasSession = useCallback(async (messageId: string): Promise<boolean> => {
    if (!messageId) return false;
    
    try {
      // Add a cache for frequently checked messages to avoid unnecessary API calls
      const cacheKey = `message-session-check-${messageId}`;
      const cachedResult = localStorage.getItem(cacheKey);
      
      if (cachedResult) {
        // Use cached result if available (valid for 5 minutes)
        const { result, timestamp } = JSON.parse(cachedResult);
        const now = Date.now();
        if (now - timestamp < 5 * 60 * 1000) { // 5 minutes
          return result;
        }
      }
      
      // Make API call to check if message has associated sessions
      const response = await fetch(`/api/tutoring-sessions?message_id=${messageId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      
      // Check if there are any sessions associated with this message
      const hasSession = Array.isArray(data.sessions) && data.sessions.length > 0;
      
      // Cache the result
      localStorage.setItem(cacheKey, JSON.stringify({
        result: hasSession,
        timestamp: Date.now()
      }));
      
      return hasSession;
    } catch (error) {
      return false;
    }
  }, []);

  // Check if we're in a browser environment before using localStorage
  const isBrowser = typeof window !== 'undefined';

  // Update the handleRealtimeMessage function to check for browser environment
  const handleRealtimeMessage = useCallback(async (payload: any) => {
    const messageData = payload.payload;
    if (!messageData || !messageData.conversation_id) return;
    
    // Update the message in browser cache - only if in browser environment
    if (isBrowser && messageData.id) {
      // Update in messages cache for the conversation
      const messagesCacheKey = `${CACHE_CONFIG.MESSAGES_CACHE_PREFIX}${messageData.conversation_id}`;
      
      updateItemInArrayCache(
        messagesCacheKey,
        messageData.id,
        () => messageData,
        'id'
      );
      
      // Update the conversation's last message
      updateCache(CACHE_CONFIG.CONVERSATIONS_CACHE_KEY, (conversations) => {
        if (!conversations || !Array.isArray(conversations)) {
          return conversations;
        }
        
        return conversations.map(conversation => {
          if (conversation.id === messageData.conversation_id) {
            return {
              ...conversation,
              last_message: {
                id: messageData.id,
                content: messageData.content,
                created_at: messageData.created_at,
                sender_id: messageData.sender_id
              },
              last_message_at: messageData.created_at
            };
          }
          return conversation;
        });
      });
    }
    
    // Continue with existing message handling
    if (messageContext?.handleRealtimeMessage) {
      messageContext.handleRealtimeMessage(messageData);
    }
    
    // Show notification if the message is not from the current user
    if (messageData.sender_id !== user?.id) {
      // Get sender name and avatar
      const senderName = messageData.sender?.display_name || 'Someone';
      const senderAvatar = messageData.sender?.avatar_url || null;
      
      // Check if this is a session request message
      const isSessionRequest = messageData.content?.trim().startsWith('Session Request:');
      
      // Show notification
      showNotification(
        messageData.id,
        messageData.conversation_id,
        senderName,
        senderAvatar,
        messageData.content,
        isSessionRequest
      );
    }
  }, [messageContext, user, showNotification]);

  // Update the handleSessionUpdate function to check for browser environment
  const handleSessionUpdate = useCallback((payload: any) => {
    const sessionData = payload.payload?.session;
    if (!sessionData || !sessionData.id) return;
    
    // Update the session in browser cache - only if in browser environment
    if (isBrowser) {
      // Update the specific session cache
      updateCache(`session:${sessionData.id}`, () => sessionData);
      
      // Update the session in the sessions list cache
      updateItemInArrayCache(
        CACHE_CONFIG.SESSIONS_CACHE_KEY,
        sessionData.id,
        () => sessionData
      );
      
      // Update in conversation sessions cache if available
      if (sessionData.conversation_id) {
        updateItemInArrayCache(
          `sessions:${sessionData.conversation_id}`,
          sessionData.id,
          () => sessionData
        );
      }
      
      // Update in user sessions cache if available
      if (user) {
        if (sessionData.tutor_id === user.id) {
          updateItemInArrayCache(
            `user_sessions:${user.id}:tutor`,
            sessionData.id,
            () => sessionData
          );
        }
        
        if (sessionData.student_id === user.id) {
          updateItemInArrayCache(
            `user_sessions:${user.id}:student`,
            sessionData.id,
            () => sessionData
          );
        }
      }
    }
    
    // Dispatch a custom event to notify SessionContext
    if (isBrowser) {
      const event = new CustomEvent('session-updated', { 
        detail: { session: sessionData } 
      });
      window.dispatchEvent(event);
      
      // Also dispatch a session list update event
      const listEvent = new CustomEvent('session-list-updated');
      window.dispatchEvent(listEvent);
    }
  }, [user]);

  // Handle session list update events  
  const handleSessionListUpdate = useCallback(() => {
    // Trigger a cache invalidation and session refresh
    if (sessionContext?.refreshSessions) {
      sessionContext.refreshSessions();
    }

    // Dispatch a custom event to notify other components about the update
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent('session-list-updated');
      window.dispatchEvent(customEvent);
    }

    // Also trigger cache invalidation across tabs using localStorage
    try {
      localStorage.setItem('session_cache_invalidated', Date.now().toString());
    } catch (e) {
      // Silently handle localStorage errors
    }
  }, [sessionContext]);
  
  // Handle typing indicator events
  const handleTypingIndicator = useCallback((payload: { payload: TypingIndicatorPayload }) => {
    if (!payload.payload || !messageContext) return;
    
    const { user_id, conversation_id, is_typing, display_name, timestamp } = payload.payload;
    
    // Update the typing state in the message context
    (messageContext as any).handleTypingState?.({
      userId: user_id,
      conversationId: conversation_id,
      isTyping: is_typing,
      displayName: display_name
    });
  }, [messageContext]);
  
  // Subscribe to a conversation channel
  const subscribeToConversation = useCallback(async (conversationId: string) => {
    // First check if user has premium access using the cached status when available
    if (hasPremiumAccess === false) {
      return null;
    }
    
    // If hasPremiumAccess is null (not yet checked), check it now
    if (hasPremiumAccess === null) {
      const hasAccess = await checkPremiumAccess();
      if (!hasAccess) {
        return null;
      }
    }
    
    if (!supabaseRef.current || !user || !conversationId) return null;
    
    // Create a stable key for logging to prevent excessive console output
    const stableKey = `subscription-${conversationId.substring(0, 8)}`;
    const cooldownKey = `cooldown-${conversationId}`;
    
    // Check if we're in a cooldown period for this conversation
    // This prevents rapid re-subscriptions that can happen during state transitions
    const now = Date.now();
    const lastSubscriptionAttempt = channelsRef.current[cooldownKey] as number;
    const SUBSCRIPTION_COOLDOWN = 5000; // 5 seconds
    
    if (lastSubscriptionAttempt && now - lastSubscriptionAttempt < SUBSCRIPTION_COOLDOWN) {
      return channelsRef.current[conversationId] || null;
    }
    
    // Update the subscription attempt timestamp
    channelsRef.current[cooldownKey] = now;
    
    // Skip if already subscribed - return the existing channel instead of resubscribing
    if (channelsRef.current[conversationId]) {
      // Check if channel is still valid
      const channel = channelsRef.current[conversationId];
      if (channel && 
          (channel.state === 'SUBSCRIBED' || 
           channel.state === 'JOINED' || 
           channel.state === 'JOINING' ||
           channel.state === 'joined')) {
        // Only log once every 30 seconds per conversation to reduce noise
        if (!channelsRef.current[stableKey] || 
            Date.now() - channelsRef.current[stableKey] > 30000) {
          channelsRef.current[stableKey] = Date.now();
        }
        return channel;
      } else {
        // Clean up invalid channel before creating a new one
        try {
          if (channel) {
            channel.unsubscribe();
          }
          delete channelsRef.current[conversationId];
        } catch (e) {
        }
      }
    }
    
    // Create channel name based on conversation ID
    const channelName = `tutoring_session:conversation:${conversationId}`;
    
    try {
      // Refresh auth token before subscribing to prevent token expiration errors
      await refreshTokenIfNeeded(supabaseRef.current);
      
      // Create and subscribe to the channel
      const channel = supabaseRef.current.channel(channelName)
        .on('broadcast', { event: 'message' }, (payload: { payload: RealtimeMessage }) => {
          // Wrap the async call in a function that catches errors
          handleRealtimeMessage(payload).catch(err => {
          });
        })
        .on('broadcast', { event: 'session_update' }, handleSessionUpdate)
        .on('broadcast', { event: 'session_list_update' }, handleSessionListUpdate)
        .on('broadcast', { event: 'typing' }, handleTypingIndicator)
        .subscribe((status: string) => {
          
          // Update subscribed channels list for UI
          if (status === 'SUBSCRIBED') {
            setSubscribedChannels(prev => 
              prev.includes(conversationId) ? prev : [...prev, conversationId]
            );
          }
        });
      
      // Save the channel reference
      channelsRef.current[conversationId] = channel;
      // Record subscription time for logging throttling
      channelsRef.current[stableKey] = Date.now();
      
      // Return the channel so it can be used for unsubscription
      return channel;
    } catch (error) {
      return null;
    }
  }, [user, handleRealtimeMessage, handleSessionUpdate, handleSessionListUpdate, handleTypingIndicator, hasPremiumAccess, checkPremiumAccess]);

  // Listen for PostgreSQL changes about new conversations
  const listenForNewConversations = useCallback(async () => {
    // First check if user has premium access
    if (!hasPremiumAccess && hasPremiumAccess !== null) {
      return;
    }
    
    // If hasPremiumAccess is null (not yet checked), check it now
    if (hasPremiumAccess === null) {
      const hasAccess = await checkPremiumAccess();
      if (!hasAccess) {
        return;
      }
    }
    
    if (!user || !supabaseRef.current) return;

    // Refresh auth token before subscribing
    await refreshTokenIfNeeded(supabaseRef.current);
    
    // Subscribe to changes in conversations table for this user
    const channel = supabaseRef.current
      .channel('conversation-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        (payload: PostgresChangePayload) => {
          
          // Get the conversation ID
          const conversationId = payload.new.id;
          
          // Check if this conversation involves the current user
          const participants = payload.new.participants || [];
          const isParticipant = participants.some((p) => p.user_id === user.id);

          // Subscribe to the conversation if it's for the current user
          if (isParticipant && conversationId) {
            
            // Use the realtime subscription method
            subscribeToConversation(conversationId);
            
            // Show notification for new conversation
            const otherParticipant = participants.find(p => p.user_id !== user.id);
            const participantName = otherParticipant?.user?.display_name || 'Someone';
            
            // Only show notification if the conversation wasn't created by the current user
            if (payload.new.created_by !== user.id) {
              showNotification(
                `new-conversation-${conversationId}`,
                conversationId,
                participantName,
                otherParticipant?.user?.avatar_url || null,
                'Started a new conversation with you',
                false
              );
            }
            
            // Move the conversation to the top of the list
            if (messageContext?.conversations) {
              const conversation = messageContext.conversations.find(c => c.id === conversationId);
              if (conversation) {
                // We need to use the browser's API to refresh the conversations
                // This will trigger the MessageContext to fetch fresh conversations
                fetch('/api/conversations', {
                  credentials: 'include',
                  headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                  }
                });
              }
            }
          }
        }
      )
      .subscribe();
    
    // Store the channel for cleanup
    channelsRef.current['conversation-changes'] = channel;
    
    return () => {
      channel.unsubscribe();
    };
  }, [user, subscribeToConversation, hasPremiumAccess, checkPremiumAccess, showNotification, messageContext]);

  // Subscribe to user's conversations automatically
  useEffect(() => {
    if (!user || !supabaseRef.current || !messageContext?.conversations || !messageContext.conversations.length) return;
    
    // Only continue if user has premium access
    if (hasPremiumAccess === false) {
      return;
    }
    
    // If hasPremiumAccess is null (not yet checked), we'll let subscribeToConversation handle the check
    
    // Track which conversations we're currently processing to avoid redundant operations
    const processedConversations = new Set<string>();
    
    // Subscribe to all user conversations
    messageContext.conversations.forEach(conversation => {
      const conversationId = conversation.id;
      
      // Skip if we've already processed this conversation in this effect run
      if (processedConversations.has(conversationId)) return;
      
      // Mark as processed
      processedConversations.add(conversationId);
      
      // Subscribe with a small delay to avoid overwhelming the connection
      setTimeout(() => {
        if (user) { // Double-check user is still logged in
          subscribeToConversation(conversationId);
        }
      }, Math.random() * 1000); // Random delay up to 1 second to spread out connection attempts
    });
    
    // Listen for new conversations created in PostgreSQL
    listenForNewConversations();
    
  }, [user, messageContext?.conversations, subscribeToConversation, listenForNewConversations, hasPremiumAccess]);

  // Unsubscribe from a conversation channel
  const unsubscribeFromConversation = useCallback((conversationId: string) => {
    const channel = channelsRef.current[conversationId];
    if (channel) {
      try {
        // Only unsubscribe if the channel exists and has an active subscription
        // Check for both uppercase and lowercase state names
        const activeStates = ['SUBSCRIBED', 'JOINED', 'joined', 'subscribed'];
        if (activeStates.includes(channel.state)) {
          channel.unsubscribe();
        } else {
        }
        
        // Remove from our channel references
        delete channelsRef.current[conversationId];
        
        // Update subscribed channels list for UI
        setSubscribedChannels(prev => prev.filter(id => id !== conversationId));
      } catch (error) {
      }
    }
  }, []);
  
  // Broadcast a message to all subscribers
  const broadcastMessage = useCallback((message: RealtimeMessage) => {
    if (!supabaseRef.current || !message.conversation_id) return;
    
    const conversationId = message.conversation_id;
    const channelName = `tutoring_session:conversation:${conversationId}`;
    
    try {
      // Refresh token before sending broadcast
      refreshTokenIfNeeded(supabaseRef.current).then(() => {
        // Get existing channel or create a new one
        let channel = channelsRef.current[conversationId];
        
        // If no existing channel, create and subscribe to a new one
        if (!channel) {
          channel = supabaseRef.current.channel(channelName);
          channel.subscribe((status: string) => {
          });
          channelsRef.current[conversationId] = channel;
        }
        
        // Send the broadcast
        channel.send({
          type: 'broadcast',
          event: 'message',
          payload: message
        });
      });
    } catch (error) {
    }
  }, []);

  // Broadcast a session update
  const broadcastSessionUpdate = useCallback((session: RealtimeSession) => {
    if (!supabaseRef.current || !session.conversation_id) return;
    
    const conversationId = session.conversation_id;
    const channelName = `tutoring_session:conversation:${conversationId}`;
    
    try {
      // Refresh token before sending broadcast
      refreshTokenIfNeeded(supabaseRef.current).then(() => {
        // Get existing channel or create a new one
        let channel = channelsRef.current[conversationId];
        
        // If no existing channel, create and subscribe to a new one
        if (!channel) {
          channel = supabaseRef.current.channel(channelName);
          channel.subscribe((status: string) => {
          });
          channelsRef.current[conversationId] = channel;
        }
        
        // Send the broadcast
        channel.send({
          type: 'broadcast',
          event: 'session_update',
          payload: { session }
        });
      });
    } catch (error) {
    }
  }, []);

  // Broadcast a typing indicator
  const broadcastTypingIndicator = useCallback((conversationId: string, isTyping: boolean) => {
    if (!supabaseRef.current || !conversationId || !user) return;
    
    const channelName = `tutoring_session:conversation:${conversationId}`;
    
    try {
      // Refresh token before sending broadcast
      refreshTokenIfNeeded(supabaseRef.current).then(() => {
        // Get existing channel or create a new one
        let channel = channelsRef.current[conversationId];
        
        // If no existing channel, create and subscribe to a new one
        if (!channel) {
          channel = supabaseRef.current.channel(channelName);
          channel.subscribe((status: string) => {
          });
          channelsRef.current[conversationId] = channel;
        }
        
        // Send the broadcast
        channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user_id: user.id,
            conversation_id: conversationId,
            is_typing: isTyping,
            display_name: user.name,
            timestamp: Date.now()
          }
        });
      });
    } catch (error) {
    }
  }, [user]);

  // Listen for storage events for new messages
  useEffect(() => {
    if (!user) return;
    
    // Handler for localStorage events (works across tabs)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'latest_message' && event.newValue) {
        try {
          const messageData = JSON.parse(event.newValue);
          
          
          // Skip processing if this is from the current user (to avoid duplicates)
          if (messageData.sender_id === user.id) {
            return;
          }
          
          // Process as a normal realtime message - use format expected by handler
          // Since handleRealtimeMessage is now async, we need to catch any errors
          handleRealtimeMessage({ 
            payload: messageData 
          }).catch(err => {
          });
          
          // If this is a new conversation, make sure we're subscribed to it
          if (messageData.conversation_id && !channelsRef.current[messageData.conversation_id]) {
            subscribeToConversation(messageData.conversation_id);
          }
        } catch (error) {
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, handleRealtimeMessage, subscribeToConversation]);

  // Provide the realtime context
  return (
    <RealtimeContext.Provider
      value={{
        subscribeToConversation,
        unsubscribeFromConversation,
        broadcastMessage,
        broadcastSessionUpdate,
        broadcastTypingIndicator,
        showNotification,
        connected,
        subscribedChannels
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

// Hook for using the realtime context
export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
}; 