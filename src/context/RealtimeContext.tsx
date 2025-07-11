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
  created_at: string;
  updated_at?: string;
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

  // Handle realtime message
  const handleRealtimeMessage = useCallback(async (payload: { payload: RealtimeMessage }) => {
    if (!payload.payload) return;

    
    const message = payload.payload;
    
    // First check if we have this sender in our cache
    let senderInfo = senderCache.current.get(message.sender_id) || message.sender || {
      id: message.sender_id,
      display_name: 'Unknown User',
      avatar_url: null,
      is_tutor: false,
      first_name: '',
      last_name: ''
    };
    
    
    // If we're missing important sender info, try to get it from existing conversations
    if (senderInfo.display_name === 'Unknown User' || senderInfo.avatar_url === null) {
      // First try to find the sender in the current conversations
      if (messageContext?.conversations && messageContext.conversations.length > 0) {
        
        // Look through all conversations for this sender
        for (const conversation of messageContext.conversations) {
          if (conversation.participants) {
            const participant = conversation.participants.find(p => 
              p.user_id === message.sender_id || (p.user && p.user.id === message.sender_id)
            );
            
            if (participant && participant.user) {
              
              // Update sender info with data from conversations
              senderInfo = {
                id: message.sender_id,
                display_name: participant.user.display_name || 
                             (participant.user.first_name && participant.user.last_name ? 
                              `${participant.user.first_name} ${participant.user.last_name}` : 
                              participant.user.id || senderInfo.display_name),
                avatar_url: participant.user.avatar_url || senderInfo.avatar_url,
                is_tutor: participant.user.is_tutor || false,
                first_name: participant.user.first_name || '',
                last_name: participant.user.last_name || ''
              };
              
              // Cache the sender info
              senderCache.current.set(message.sender_id, senderInfo);
              break;
            }
          }
        }
      }
      
      // If we still don't have good sender info, try the API as a fallback
      if ((senderInfo.display_name === 'Unknown User' || senderInfo.avatar_url === null) && 
          !senderCache.current.has(message.sender_id)) {
        try {
          // Try to get user profile from API
          const response = await fetch(`/api/users/profile/${message.sender_id}`, {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            if (userData.user) {
              // Update sender info with fetched data
              senderInfo = {
                ...senderInfo,
                display_name: userData.user.first_name && userData.user.last_name 
                  ? `${userData.user.first_name} ${userData.user.last_name}`
                  : userData.user.id || senderInfo.display_name,
                avatar_url: userData.user.avatar_url || senderInfo.avatar_url,
                first_name: userData.user.first_name || '',
                last_name: userData.user.last_name || '',
                is_tutor: userData.user.is_tutor || false
              };
              
              // Cache the sender info for future messages
              senderCache.current.set(message.sender_id, senderInfo);
            }
          } else {
          }
        } catch (error) {
        }
      }
    }
    
      const enhancedMessage = {
        ...message,
      sender: {
        id: senderInfo.id || message.sender_id,
        display_name: senderInfo.display_name || 'Unknown User',
        avatar_url: senderInfo.avatar_url || null,
        is_tutor: senderInfo.is_tutor || false,
        first_name: senderInfo.first_name || '',
        last_name: senderInfo.last_name || ''
      },
      _notificationTimestamp: Date.now(),
      timestamp: new Date(message.created_at || new Date()), // Use Date object for MessageContext
      read: false,
      isSessionRequest: message.content?.trim().startsWith('Session Request:') || false
    };
    
    
    // Update messages in the message context
    messageContext?.handleRealtimeMessage?.(enhancedMessage);
      
    // For the custom event, we can use a string timestamp which is easier to serialize
    const messageForEvent = {
      ...enhancedMessage,
      timestamp: enhancedMessage.timestamp.toISOString() // Convert to string for the event
    };
    
    
    // Dispatch a custom event so other components (like meeting page) can also process this message
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent('supabase-message', { 
        detail: { 
          payload: messageForEvent 
        }
      });
      window.dispatchEvent(customEvent);
    }
    
    // Only show notifications for messages from other users
    // Do this check after state update to ensure UI consistency
    if (!user || message.sender_id === user.id) {
      return;
    }
    
    // Check if we're already on the messages page for this conversation
    const isOnMessagesPage = messageContext?.pageVisibility?.isOnMessagesPage || false;
    const selectedConversationId = messageContext?.selectedConversationId || null;
    const pageVisibility = messageContext?.pageVisibility || { isVisible: true, isFocused: true };
    
    // Skip notification if user is on messages page, viewing this conversation and page is visible/focused
    if (isOnMessagesPage && 
        selectedConversationId === message.conversation_id && 
        pageVisibility.isVisible && 
        pageVisibility.isFocused) {
      // Mark as read automatically
      messageContext?.markConversationAsRead?.(message.conversation_id);
      return;
    }
    
    // Check if we've already shown this notification recently using new parameters
    if (message.id && message.conversation_id && message.content && 
        hasRecentlyShown(message.id, message.conversation_id, message.content)) {
      return;
    }
    
    // Process the message for notification
    try {
      // Only store if it's a valid message with required fields
      if (message.id && message.conversation_id) {
        // Make sure we have complete sender information for localStorage
        const messageForStorage = {
          ...enhancedMessage,
          timestamp: enhancedMessage.timestamp.toISOString(), // Convert to string for localStorage
          sender: {
            id: enhancedMessage.sender.id,
            display_name: enhancedMessage.sender.display_name,
            avatar_url: enhancedMessage.sender.avatar_url,
            is_tutor: enhancedMessage.sender.is_tutor,
            first_name: enhancedMessage.sender.first_name,
            last_name: enhancedMessage.sender.last_name
          }
        };
        
        // Update localStorage with latest message to trigger notification in other tabs
        localStorage.setItem('latest_message', JSON.stringify(messageForStorage));
        
        
        // Determine the best display name
        const senderDisplayName = enhancedMessage.sender.display_name || 'Someone';
        
        
        // First check if the message content indicates it's a session request
        let isSessionRequest = message.content && message.content.trim().startsWith('Session Request:');
        
        // If content doesn't indicate a session request, check the database
        if (!isSessionRequest) {
          try {
            isSessionRequest = await checkMessageHasSession(message.id);
          } catch (error) {
            // Default to false in case of error
            isSessionRequest = false;
          }
        }
        
        // Show notification in current tab
        const notificationShown = showNotification(
          message.id,
          message.conversation_id,
          senderDisplayName,
          enhancedMessage.sender.avatar_url,
          message.content || '',
          isSessionRequest
        );
        
      }
    } catch (error) {
    }
  }, [messageContext, user, showNotification, hasRecentlyShown, checkMessageHasSession]);

  // Handle realtime session update events
  const handleSessionUpdate = useCallback((payload: { payload: { session: RealtimeSession } }) => {
    if (!payload.payload?.session || !sessionContext) return;
    
    // Ensure the session has all required fields
    const updatedSession = {
      ...payload.payload.session,
      // Ensure created_at is present
      created_at: payload.payload.session.created_at || new Date().toISOString()
    };
    
    // Show notification for certain session status changes
    if (updatedSession.status && user) {
      const isForCurrentUser = 
        updatedSession.tutor_id === user.id || 
        updatedSession.student_id === user.id;
      
      // Only show notification if this session is for current user and they didn't trigger the update
      if (isForCurrentUser) {
        // Disabled all notifications for session updates as requested
        const shouldShowNotification = false;
        
        // Code below is kept but not executed due to shouldShowNotification being false
        const sessionName = updatedSession.name || 'Session';
        let notificationContent = '';
        
        // Determine notification content based on session status
        switch(updatedSession.status) {
          case 'accepted':
            if (user.id === updatedSession.student_id) {
              const costDisplay = updatedSession.cost ? ` (${updatedSession.cost} Credits)` : '';
              notificationContent = `Your session "${sessionName}"${costDisplay} has been accepted`;
            }
            break;
          case 'started':
            notificationContent = `Session "${sessionName}" has started`;
            break;
          case 'ended':
            notificationContent = `Session "${sessionName}" has ended`;
            break;
          case 'cancelled':
            notificationContent = `Session "${sessionName}" has been cancelled`;
            break;
        }
        
        if (shouldShowNotification) {
          showNotification(
            `session-${updatedSession.id}-${updatedSession.status}`,
            updatedSession.conversation_id,
            'Session Update',
            null,
            notificationContent,
            true // Treat session notifications like session requests
          );
        }
      }
    }
    
    // Update the session directly in session context if available
    if (sessionContext.updateSession) {
      // Convert RealtimeSession to ActiveSession - we need to ensure all required properties are present
      const convertedSession = {
        // Include all existing properties
        ...updatedSession,
        // Ensure required properties exist
        tutor_id: updatedSession.tutor_id || '',
        student_id: updatedSession.student_id || '',
        message_id: updatedSession.message_id || '',
        // Explicitly include cost to ensure it's passed through
        cost: updatedSession.cost
      } as ActiveSession;
      
      sessionContext.updateSession(convertedSession);
    }

    // Trigger cache invalidation across tabs using localStorage
    try {
      // Store timestamp to ensure the event is unique
      localStorage.setItem('session_cache_invalidated', Date.now().toString());
    } catch (e) {
      // Silently handle localStorage errors
    }
  }, [sessionContext, user, showNotification]);

  // Handle session list update events  
  const handleSessionListUpdate = useCallback(() => {
    // Don't trigger a refresh - rely on direct state updates instead
    // Just trigger cache invalidation across tabs using localStorage
    try {
      localStorage.setItem('session_cache_invalidated', Date.now().toString());
    } catch (e) {
      // Silently handle localStorage errors
    }
  }, []);
  
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