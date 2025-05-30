"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { createClient } from "@/utils/supabase/client";
import { getFromCache, saveToCache, CACHE_CONFIG } from "@/lib/caching";
import { useRouter } from "next/navigation";
import { 
  getCsrfTokenFromStorage, 
  CSRF_HEADER_NAME,
  useCsrfToken
} from '@/lib/csrf/client';

// Define the expiry time for temporary conversations - 24 hours
const TEMP_CONVERSATION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  content: string;
  timestamp: Date;
  read: boolean;
  sessionRequest?: {
    id?: string;
    title: string;
    scheduledFor: string;
    conversationId: string;
    messageId: string;
    studentId?: string;
    tutorId?: string;
    studentReady?: boolean;
    tutorReady?: boolean;
    status?: "requested" | "accepted" | "started" | "ended" | "cancelled";
    tokens?: number;
  } | null;
  created_at?: string;
  conversation_id?: string;
  sender?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_tutor: boolean;
  };
  status?: 'sending' | 'sent' | 'delivered' | 'error';
  // For backwards compatibility 
  isSessionRequest?: boolean;
}

export interface SessionRequest {
  id?: string;
  title: string;
  scheduledFor: string;
  conversationId: string;
  messageId: string;
  studentId?: string;
  tutorId?: string;
  studentReady?: boolean;
  tutorReady?: boolean;
  status?: "requested" | "accepted" | "started" | "ended" | "cancelled";
  tokens?: number;
}

interface Conversation {
  id: string;
  participants: Array<{
    user_id: string;
    user?: {
      id: string;
      display_name: string;
      first_name?: string;
      last_name?: string;
      avatar_url?: string | null;
      is_tutor: boolean;
    };
    last_viewed_at?: string | null;
  }>;
  last_message?: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
  };
  last_message_at?: string;
  unreadCount: number;
  // Computed property for easier access in UI
  participant?: {
    id: string;
    display_name: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string | null;
    is_tutor: boolean;
  };
}

// Add typing indicator state interface
interface TypingState {
  [conversationId: string]: {
    isTyping: boolean;
    userId: string;
    displayName?: string;
    timestamp: number;
  }[];
}

// Add page visibility interface
interface PageVisibility {
  isVisible: boolean;
  isFocused: boolean;
  currentPath: string;
  isOnMessagesPage: boolean;
}

interface MessageContextType {
  conversations: Conversation[];
  messages: { [conversationId: string]: Message[] };
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string) => void;
  currentConversation: Conversation | null;
  sendMessage: (conversationId: string, content: string, options?: { maxRetries?: number }) => Promise<Message>;
  markConversationAsRead: (conversationId: string) => Promise<boolean | undefined>;
  loading: boolean;
  loadingMessages: boolean;
  hasUnreadMessages: (conversationId: string) => boolean;
  setActiveConversation: (id: string) => void;
  handleRealtimeMessage: (message: Message) => void;
  refreshMessages: (conversationId: string) => void;
  typingStates: TypingState;
  setUserTyping: (conversationId: string, isTyping: boolean) => void;
  isUserTyping: (conversationId: string, userId?: string) => boolean;
  handleTypingState: (payload: { userId: string; conversationId: string; isTyping: boolean; displayName?: string }) => void;
  pageVisibility: PageVisibility;
  createTempConversation: (tutorId: string, tutorName: string, tutorAvatar?: string | null) => string;
  isTempConversation: (conversationId: string) => boolean;
}

const MessageContext = createContext<MessageContextType | null>(null);

export const MessageProvider = ({ children, pageVisibility: propPageVisibility }: { 
  children: ReactNode;
  pageVisibility?: PageVisibility;
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [conversationId: string]: Message[] }>({});
  const [selectedConversationId, _setSelectedConversationId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('selectedConversationId');
        return stored || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Add a ref to track which conversations have had their messages loaded
  const loadedConversationsRef = useRef<Set<string>>(new Set());
  
  // Add default page visibility
  const defaultPageVisibility: PageVisibility = {
    isVisible: true,
    isFocused: true,
    currentPath: '',
    isOnMessagesPage: false
  };
  
  // Use provided visibility or default
  const pageVisibility = propPageVisibility || defaultPageVisibility;
  
  // Add typing indicator state
  const [typingStates, setTypingStates] = useState<TypingState>({});
  const typingTimeoutRef = useRef<{[key: string]: NodeJS.Timeout}>({});
  
  // Add cache control
  const messagesCacheRef = useRef<{[conversationId: string]: {data: Message[], timestamp: number}}>({});
  const MESSAGE_CACHE_TTL = 900000; // 15 minutes - matching server cache

  // Add cache for premium access status
  const [hasPremiumAccess, setHasPremiumAccess] = useState<boolean | null>(null);
  const premiumAccessCheckedRef = useRef<boolean>(false);
  const premiumAccessTimestampRef = useRef<number>(0);
  const PREMIUM_ACCESS_CACHE_TTL = 300000; // 5 minutes
  
  // Add a ref to track conversations that have been checked for premium access
  const checkedConversationsRef = useRef<Set<string>>(new Set());

  // Map to track temporary conversations
  const [tempConversations, setTempConversations] = useState<{[id: string]: {
    tutorId: string,
    tutorName: string,
    tutorAvatar: string | null,
    createdAt: Date
  }}>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('tempConversations');
        if (stored) {
          // Parse stored data and convert string dates back to Date objects
          const parsed = JSON.parse(stored);
          const now = Date.now();
          const cleanedConversations: {[id: string]: any} = {};
          
          // Filter out expired temporary conversations (older than 24 hours)
          Object.keys(parsed).forEach(key => {
            const createdAtDate = new Date(parsed[key].createdAt);
            const age = now - createdAtDate.getTime();
            
            // Only keep conversations that are less than 24 hours old
            if (age < TEMP_CONVERSATION_EXPIRY_MS) {
              cleanedConversations[key] = {
                ...parsed[key],
                createdAt: createdAtDate
              };
            } else {
              console.log(`Removing expired temporary conversation ${key}, age: ${Math.round(age / 3600000)} hours`);
            }
          });
          
          // Save the cleaned list back to localStorage
          if (Object.keys(parsed).length !== Object.keys(cleanedConversations).length) {
            localStorage.setItem('tempConversations', JSON.stringify(cleanedConversations));
          }
          
          return cleanedConversations;
        }
      } catch (e) {
        console.error('Failed to load temporary conversations from localStorage:', e);
        // Clear corrupted data
        localStorage.removeItem('tempConversations');
      }
    }
    return {};
  });

  // Check if a conversation is temporary
  const isTempConversation = useCallback((conversationId: string) => {
    return conversationId.startsWith('temp-') && Boolean(tempConversations[conversationId]);
  }, [tempConversations]);
  
  // Check if user has premium access
  const checkPremiumAccess = useCallback(async () => {
    if (!user) {
      return false;
    }
    
    // Add caching for premium access checks to avoid unnecessary API calls
    const now = Date.now();
    
    // If we have a cached result and it's not expired, use it
    if (hasPremiumAccess !== null && 
        premiumAccessCheckedRef.current && 
        (now - premiumAccessTimestampRef.current < PREMIUM_ACCESS_CACHE_TTL)) {
      console.log('Using cached premium access status:', hasPremiumAccess);
      return hasPremiumAccess;
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
        console.error('Error checking user premium access:', response.statusText);
        return false;
      }
      
      const data = await response.json();
      
      // User has access if they are a tutor OR have premium access
      const hasAccess = data.user?.role === 'tutor' || data.user?.has_access === true;
      
      // Update cache
      setHasPremiumAccess(hasAccess);
      premiumAccessCheckedRef.current = true;
      premiumAccessTimestampRef.current = now;
      
      return hasAccess;
    } catch (error) {
      console.error('Error checking user premium access:', error);
      return false;
    }
  }, [user, hasPremiumAccess]);

  // Create a temporary conversation
  const createTempConversation = useCallback((tutorId: string, tutorName: string, tutorAvatar?: string | null) => {
    if (!user) throw new Error('Not authenticated');

    // Check if a conversation already exists with this tutor
    const existingConversation = conversations.find(conv => 
      conv.participants.some(p => p.user_id === tutorId)
    );
    
    if (existingConversation) {
      console.log(`Using existing conversation ${existingConversation.id} with tutor ${tutorId}`);
      // Select the existing conversation
      setSelectedConversationId(existingConversation.id);
      return existingConversation.id;
    }

    // Check if a temporary conversation already exists with this tutor
    const existingTempConv = Object.entries(tempConversations).find(([_, conv]) => 
      conv.tutorId === tutorId
    );

    if (existingTempConv) {
      console.log(`Using existing temporary conversation ${existingTempConv[0]} with tutor ${tutorId}`);
      // Select the existing temporary conversation
      setSelectedConversationId(existingTempConv[0]);
      return existingTempConv[0];
    }

    // Create a unique temporary ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create the temporary conversation and add to state
    setTempConversations(prev => ({
      ...prev,
      [tempId]: {
        tutorId,
        tutorName,
        tutorAvatar: tutorAvatar || null,
        createdAt: new Date()
      }
    }));

    // Create a conversation object and add it to the conversations array
    const tempConversation: Conversation = {
      id: tempId,
      participants: [
        {
          user_id: user.id,
          user: {
            id: user.id,
            display_name: user.name || 'You',
            first_name: user.name?.split(' ')[0] || '',
            last_name: user.name?.split(' ')[1] || '',
            avatar_url: user.profilePic || user.avatar_url || null,
            is_tutor: user.role === 'tutor'
          }
        },
        {
          user_id: tutorId,
          user: {
            id: tutorId,
            display_name: tutorName,
            first_name: tutorName.split(' ')[0] || '',
            last_name: tutorName.split(' ')[1] || '',
            avatar_url: tutorAvatar || null,
            is_tutor: true
          }
        }
      ],
      unreadCount: 0,
      participant: {
        id: tutorId,
        display_name: tutorName,
        first_name: tutorName.split(' ')[0] || '',
        last_name: tutorName.split(' ')[1] || '',
        avatar_url: tutorAvatar || null,
        is_tutor: true
      }
    };

    setConversations(prev => [tempConversation, ...prev]);
    
    return tempId;
  }, [user, setConversations, conversations, tempConversations]);

  // Wrap the state setter to also update localStorage
  const setSelectedConversationId = useCallback((id: string) => {
    _setSelectedConversationId(id);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('selectedConversationId', id);
      } catch (e) {
        console.error('Failed to store selected conversation in localStorage:', e);
      }
    }
  }, []);

  // Check if a conversation has unread messages
  const hasUnreadMessages = useCallback((conversationId: string) => {
    // If this is the currently selected conversation AND
    // the user is on the messages page AND
    // the page is visible and focused, consider it read
    if (
      conversationId === selectedConversationId && 
      pageVisibility.isOnMessagesPage && 
      pageVisibility.isVisible && 
      pageVisibility.isFocused
    ) {
      return false;
    }
    
    // First check if we have a pre-calculated unreadCount
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return false;
    
    // If we have an unreadCount > 0, use that as our primary indicator
    if (conversation.unreadCount && conversation.unreadCount > 0) {
      return true;
    }
    
    // Find the current user's participant entry
    const currentUserParticipant = conversation.participants?.find(p => p.user_id === user?.id);
    const lastViewedAt = currentUserParticipant?.last_viewed_at;
    
    // If there's a last message and no lastViewedAt, this conversation has unread messages
    if (conversation.last_message && !lastViewedAt && conversation.last_message.sender_id !== user?.id) {
      return true;
    }
    
    // If we have a last_message and lastViewedAt, compare timestamps
    if (conversation.last_message && lastViewedAt) {
      const lastViewedTime = new Date(lastViewedAt).getTime();
      const lastMessageTime = new Date(conversation.last_message.created_at || '').getTime();
      
      // If the last message is newer than last_viewed_at and not from the user, it's unread
      if (lastMessageTime > lastViewedTime && conversation.last_message.sender_id !== user?.id) {
        return true;
      }
    }
    
    // Check if we have loaded messages to calculate from
    const conversationMessages = messages[conversationId] || [];
    if (conversationMessages.length === 0) return false;
    
    // If no last_viewed_at, all messages from others are unread
    if (!lastViewedAt) {
      return conversationMessages.some(msg => msg.sender_id !== user?.id);
    }
    
    // Check if any message is after last_viewed_at and not from current user
    const lastViewedTime = new Date(lastViewedAt).getTime();
    return conversationMessages.some(msg => {
      const messageTime = new Date(msg.created_at || msg.timestamp).getTime();
      return messageTime > lastViewedTime && msg.sender_id !== user?.id;
    });
  }, [conversations, messages, user?.id, selectedConversationId, pageVisibility]);

  // Mark a conversation as read
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!user || !conversationId) return false;
    
    try {
      // Skip API calls for temporary conversations
      if (isTempConversation(conversationId)) {
        console.log(`Skipping mark as read for temporary conversation: ${conversationId}`);
        return true;
      }
      
      // Check if user has premium access before proceeding
      const accessStatus = await checkPremiumAccess();
      if (!accessStatus) {
        console.log(`User does not have premium access, skipping mark as read for conversation: ${conversationId}`);
        return false;
      }
      
      // Check if this conversation is already marked as read
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) {
        console.log(`Conversation ${conversationId} not found in state`);
        return false;
      }
      
      // If unreadCount is already 0, don't make unnecessary API calls
      if (conversation.unreadCount === 0) {
        // Verify there are no unread messages before skipping
        const hasUnread = hasUnreadMessages(conversationId);
        if (!hasUnread) {
          console.log(`Conversation ${conversationId} has no unread messages, skipping mark as read`);
          return true;
        }
      }
      
      console.log(`Marking conversation ${conversationId} as read for user ${user.id}`);
      
      // Get CSRF token
      const csrfToken = getCsrfTokenFromStorage();
      
      // Create headers with CSRF token if available
      const headers: HeadersInit = {};
      if (csrfToken) {
        headers[CSRF_HEADER_NAME] = csrfToken;
      } else {
        console.warn('CSRF token not found for markConversationAsRead. This request might fail due to CSRF protection.');
      }
      
      // Make API call to mark as read
      const response = await fetch(`/api/conversations/${conversationId}/mark-read`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`Error marking conversation as read: ${response.status}`, errorData);
        return false;
      }
      
      // Log success response
      const responseData = await response.json().catch(() => ({}));
      console.log(`Marked conversation as read successfully:`, responseData);
      
      // Update the last_viewed_at timestamp in our local state
      const currentTimestamp = new Date().toISOString();
      const updatedConversations = conversations.map(convo => {
        if (convo.id !== conversationId) return convo;
        
        // Update the conversation
        const updatedParticipants = convo.participants?.map(p => 
          p.user_id === user.id 
            ? { ...p, last_viewed_at: currentTimestamp }
            : p
        ) || [];
        
        return {
          ...convo,
          participants: updatedParticipants,
          unreadCount: 0
        };
      });
      
      // Set the conversations state with the updated data
      setConversations(updatedConversations);
      console.log(`Updated conversation ${conversationId} in state with new last_viewed_at`);
      
      return true;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      return false;
    }
  }, [user, conversations, setConversations, hasUnreadMessages, isTempConversation, checkPremiumAccess, hasPremiumAccess]);

  // Helper function to verify if a conversation is ready to receive messages
  const verifyConversationReady = async (conversationId: string): Promise<boolean> => {
    if (!conversationId || !user) return false;
    
    console.log(`Verifying if conversation ${conversationId} is ready to receive messages`);
    
    try {
      // Make up to 3 attempts with increasing delays
      const maxAttempts = 3;
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Add delay between attempts, increasing with each attempt
        if (attempt > 0) {
          const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
          console.log(`Waiting ${delay}ms before verification attempt ${attempt + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Set a timeout for the fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
          // Call the status endpoint to check if conversation is ready
          const response = await fetch(`/api/conversations/${conversationId}/status`, {
            credentials: 'include',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.log(`Conversation status check failed with status ${response.status}`);
            
            if (attempt === maxAttempts - 1) {
              console.log('All verification attempts failed, conversation may not be ready');
              return false;
            }
            
            // Continue to next attempt
            continue;
          }
          
          // Parse the response
          const data = await response.json();
          
          if (data.ready === true) {
            console.log('Conversation is ready to receive messages');
            return true;
          }
          
          console.log(`Conversation not ready yet: ${data.error || 'Unknown reason'}`);
          
          // If this is the last attempt, return false
          if (attempt === maxAttempts - 1) {
            console.log('All verification attempts failed, conversation may not be ready');
            return false;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          console.error(`Error during conversation status check (attempt ${attempt + 1}):`, error);
          
          // If this is the last attempt, return false
          if (attempt === maxAttempts - 1) {
            return false;
          }
        }
      }
      
      // If we've reached here, all attempts failed
      return false;
    } catch (error) {
      console.error('Unexpected error verifying conversation readiness:', error);
      return false;
    }
  };

  // Handle typing state received from other users
  const handleTypingState = useCallback((payload: { userId: string; conversationId: string; isTyping: boolean; displayName?: string }) => {
    const { userId, conversationId, isTyping, displayName } = payload;
    
    // Ignore typing events from the current user
    if (userId === user?.id) return;
    
    setTypingStates(prev => {
      // Get current typing users for this conversation
      const currentTyping = prev[conversationId] || [];
      
      if (isTyping) {
        // Add or update the typing status for this user
        const updatedTyping = currentTyping.filter(t => t.userId !== userId);
        updatedTyping.push({ 
          userId, 
          isTyping: true,
          displayName,
          timestamp: Date.now()
        });
        
        return {
          ...prev,
          [conversationId]: updatedTyping
        };
      } else {
        // Remove this user from typing status
        const updatedTyping = currentTyping.filter(t => t.userId !== userId);
        
        return {
          ...prev,
          [conversationId]: updatedTyping
        };
      }
    });
  }, [user?.id]);

  // Check if a specific user (or any user) is typing in a conversation
  const isUserTyping = useCallback((conversationId: string, userId?: string) => {
    const typingUsers = typingStates[conversationId] || [];
    
    // If specific userId provided, check if that user is typing
    if (userId) {
      return typingUsers.some(t => t.userId === userId && t.isTyping);
    }
    
    // Otherwise check if any user is typing
    return typingUsers.length > 0;
  }, [typingStates]);

  // Function to set the current user's typing status
  const setUserTyping = useCallback(async (conversationId: string, isTyping: boolean) => {
    if (!user || !conversationId) return;
    
    // Skip API calls for temporary conversations
    if (isTempConversation(conversationId)) {
      console.log(`Skipping typing indicator for temporary conversation: ${conversationId}`);
      return;
    }
    
    // Check if user has premium access before proceeding
    const accessStatus = await checkPremiumAccess();
    if (!accessStatus) {
      console.log(`User does not have premium access, skipping typing indicator for conversation: ${conversationId}`);
      return;
    }
    
    // Clear any existing timeout
    if (typingTimeoutRef.current[conversationId]) {
      clearTimeout(typingTimeoutRef.current[conversationId]);
    }
    
    // Create a broadcast to other users
    try {
      // Get CSRF token
      const csrfToken = getCsrfTokenFromStorage();
      
      // Create headers with CSRF token if available
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (csrfToken) {
        headers[CSRF_HEADER_NAME] = csrfToken;
      } else {
        console.warn('CSRF token not found for setUserTyping. This request might fail due to CSRF protection.');
      }
      
      // Using fetch to broadcast typing status without needing the Realtime context here
      fetch('/api/typing-indicator', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversation_id: conversationId,
          is_typing: isTyping,
          user_id: user.id,
          display_name: user.name || 'You'
        }),
        credentials: 'include'
      }).catch(error => {
        console.error('Error broadcasting typing status:', error);
      });
      
      // If user is typing, set a timeout to automatically clear typing status
      if (isTyping) {
        typingTimeoutRef.current[conversationId] = setTimeout(() => {
          setUserTyping(conversationId, false);
        }, 5000); // Auto clear after 5 seconds of inactivity
      }
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }, [user, checkPremiumAccess, isTempConversation, hasPremiumAccess]);

  // Add a helper function to handle message status updates properly
  const updateMessageStatus = useCallback((message: Message, status?: 'sending' | 'sent' | 'delivered' | 'error') => {
    if (!message) return message;
    
    // If status is explicitly provided, use it
    if (status) {
      return { ...message, status };
    }
    
    // If the message already has a status other than 'sending', keep it
    if (message.status && message.status !== 'sending') {
      return message;
    }
    
    // For new messages from the server, mark as 'sent'
    return { ...message, status: 'sent' as 'sending' | 'sent' | 'delivered' | 'error' };
  }, []);
  
  // Add a utility function to sort conversations consistently
  const sortConversations = useCallback((convos: Conversation[]): Conversation[] => {
    if (!convos || convos.length === 0) return [];
    
    // First ensure conversations have a valid last_message_at timestamp
    // This prevents messages from jumping to the bottom when they're missing a timestamp
    const normalizedConvos = convos.map(convo => {
      // If last_message_at is missing but the conversation has a last_message, use its timestamp
      if (!convo.last_message_at && convo.last_message?.created_at) {
        return {
          ...convo,
          last_message_at: convo.last_message.created_at
        };
      }
      
      // If no timestamp is available at all, use the current time to keep it at the top
      if (!convo.last_message_at) {
        return {
          ...convo,
          last_message_at: new Date().toISOString()
        };
      }
      
      return convo;
    });
    
    return [...normalizedConvos].sort((a, b) => {
      // First, temporary conversations always go first
      const aIsTemp = isTempConversation(a.id);
      const bIsTemp = isTempConversation(b.id);
      
      if (aIsTemp && !bIsTemp) return -1;
      if (!aIsTemp && bIsTemp) return 1;
      
      // For real conversations, sort by last_message_at (most recent first)
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      
      return bTime - aTime; // descending order (newest first)
    });
  }, [isTempConversation]);

  // Handle realtime messages
  const handleRealtimeMessage = useCallback((message: Message) => {
    if (!message || !message.conversation_id) return;
    
    if (message.conversation_id) {
      // Check if the message content indicates it's a session request
      // Add this check to immediately identify session requests 
      const isSessionRequestMessage = message.content && 
                                     message.content.trim().startsWith('Session Request:');
      
      // Create a session request object if it's a session request message
      const sessionRequestObj = isSessionRequestMessage ? {
        title: message.content.replace(/^Session Request: /, '').trim(),
        scheduledFor: new Date().toISOString(),
        conversationId: message.conversation_id,
        messageId: message.id
      } : undefined;
      
      const convertedMessage = {
        ...message,
        timestamp: new Date(message.created_at || new Date()),
        read: false, // Assume unread for new realtime messages
        // Set sessionRequest property if it appears to be a session request
        sessionRequest: message.sessionRequest || sessionRequestObj
      };

      // Update the messages state
      setMessages(prev => {
        // Get current messages for this conversation or initialize empty array
        const conversationId = message.conversation_id as string;
        const conversationMessages = [...(prev[conversationId] || [])];
        
        // Check if this message already exists (by id)
        const existingIndex = conversationMessages.findIndex(msg => msg.id === message.id);
        
        // We also check for messages that might be the "sending" version with a temp ID
        // This prevents duplicate messages when a message transitions from sending to sent
        const pendingIndex = message.sender_id === user?.id ? 
          conversationMessages.findIndex(msg => 
            msg.status === 'sending' && 
            msg.content === message.content && 
            msg.sender_id === message.sender_id &&
            msg.id !== message.id // Make sure IDs don't match to prevent processing the same message twice
          ) : -1;
        
        // Create a function to ensure IDs are unique in the messages array
        const ensureUniqueIds = (messages: Message[]): Message[] => {
          const seen = new Set<string>();
          return messages.filter(msg => {
            // If we've already seen this ID, filter it out
            if (seen.has(msg.id)) return false;
            // Otherwise add it to our set and keep the message
            seen.add(msg.id);
            return true;
          });
        };
        
        if (existingIndex >= 0) {
          // Message exists - update it with proper status
          // Use object spread to ensure React detects the change
          conversationMessages[existingIndex] = {
            ...conversationMessages[existingIndex],
            ...updateMessageStatus(message),
            // Preserve the original ID to maintain component identity
            id: conversationMessages[existingIndex].id
          };
        } else if (pendingIndex >= 0) {
          // Found a pending/sending message that matches this one - update it in-place
          // This creates a seamless transition from sending to sent
          conversationMessages[pendingIndex] = {
            ...conversationMessages[pendingIndex],
            ...updateMessageStatus(message),
            // Keep any fields we want to preserve from the original sending message
            status: 'sent'
          };
          
          // Important: If the ID changed, we may need to remove any other instances
          // of messages with the new ID to prevent duplicates
          const duplicateIndex = conversationMessages.findIndex(
            (msg, idx) => idx !== pendingIndex && msg.id === message.id
          );
          
          if (duplicateIndex >= 0) {
            // Remove the duplicate
            conversationMessages.splice(duplicateIndex, 1);
          }
        } else {
          // Message is new - add it with proper status
          conversationMessages.push(updateMessageStatus(message));
        }
        
        // Ensure we don't have duplicate IDs in the final array
        const deduplicatedMessages = ensureUniqueIds(conversationMessages);
        
        return {
          ...prev,
          [conversationId]: deduplicatedMessages
        };
      });

      // Move the conversation to the top of the list if it's a new message
      setConversations(prev => {
        // Find the conversation that received the message
        const conversationIndex = prev.findIndex(c => c.id === message.conversation_id);
        
        if (conversationIndex < 0) {
          // Conversation not found, can't reorder
          return prev;
        }
        
        // Make a copy of the conversation
        const conversation = { ...prev[conversationIndex] };
        
        // Update the conversation's last message info
        conversation.last_message = {
          id: message.id,
          content: message.content,
          created_at: message.created_at || new Date().toISOString(),
          sender_id: message.sender_id
        };
        conversation.last_message_at = message.created_at || new Date().toISOString();
        
        // Create a new array without the conversation
        const newConversations = prev.filter(c => c.id !== message.conversation_id);
        
        // Add the conversation at the top and ensure proper sorting
        return sortConversations([conversation, ...newConversations]);
      });
    }
    
    // Only show notifications for messages from other users
    // Do this check after state update to ensure UI consistency
    if (!user || message.sender_id === user.id) {
      console.log('Skipping notification for own message:', message.id);
      return;
    }
  }, [updateMessageStatus, user?.id, sortConversations]);

  // Get current conversation
  const currentConversation = selectedConversationId 
    ? conversations.find(conv => conv.id === selectedConversationId) || null 
    : null;
  
  // Load conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) {
        setConversations([]);
        setLoading(false);
        return;
      }

      try {
        // First check for cached conversations
        const cachedConversations = getFromCache<Conversation[]>(CACHE_CONFIG.CONVERSATIONS_CACHE_KEY);
        
        // If we have valid cached conversations, use them immediately and set loading=false
        if (cachedConversations && cachedConversations.length > 0) {
          console.log("Using cached conversations from localStorage");
          
          // Merge temporary conversations with cached conversations
          const tempConvs = createTemporaryConversationObjects();
          if (tempConvs.length > 0) {
            setConversations(sortConversations([...tempConvs, ...cachedConversations]));
          } else {
            setConversations(sortConversations(cachedConversations));
          }
          setLoading(false);
          
          // Check premium access before fetching fresh data in the background
          const accessStatus = await checkPremiumAccess();
          if (accessStatus) {
            // Fetch fresh data in the background if user has premium access
            fetchFreshConversations();
          } else {
            console.log('User does not have premium access, skipping fresh conversations fetch');
          }
          return;
        }
        
        // No cache or expired cache, check premium access before showing loading state and fetching fresh data
        const accessStatus = await checkPremiumAccess();
        if (accessStatus) {
          setLoading(true);
          await fetchFreshConversations();
        } else {
          console.log('User does not have premium access, skipping conversations fetch');
          // Create temporary conversation objects only
          const tempConvs = createTemporaryConversationObjects();
          setConversations(sortConversations(tempConvs));
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
        // Don't use mock conversations as fallback anymore
        // Just use empty array or temporary conversations
        const tempConvs = createTemporaryConversationObjects();
        setConversations(sortConversations(tempConvs));
      } finally {
        setLoading(false);
      }
    };
    
    // Helper function to convert tempConversations into Conversation objects
    const createTemporaryConversationObjects = () => {
      if (!user || Object.keys(tempConversations).length === 0) return [];
      
      return Object.entries(tempConversations).map(([tempId, tempData]) => {
        const tempConversation: Conversation = {
          id: tempId,
          participants: [
            {
              user_id: user.id,
              user: {
                id: user.id,
                display_name: user.name || 'You',
                first_name: user.name?.split(' ')[0] || '',
                last_name: user.name?.split(' ')[1] || '',
                avatar_url: user.profilePic || user.avatar_url || null,
                is_tutor: user.role === 'tutor'
              }
            },
            {
              user_id: tempData.tutorId,
              user: {
                id: tempData.tutorId,
                display_name: tempData.tutorName,
                first_name: tempData.tutorName.split(' ')[0] || '',
                last_name: tempData.tutorName.split(' ')[1] || '',
                avatar_url: tempData.tutorAvatar || null,
                is_tutor: true
              }
            }
          ],
          unreadCount: 0,
          participant: {
            id: tempData.tutorId,
            display_name: tempData.tutorName,
            first_name: tempData.tutorName.split(' ')[0] || '',
            last_name: tempData.tutorName.split(' ')[1] || '',
            avatar_url: tempData.tutorAvatar || null,
            is_tutor: true
          }
        };
        return tempConversation;
      });
    };
    
    // Helper function to fetch fresh conversations and update cache
    const fetchFreshConversations = async () => {
      if (!user) {
        console.log('No user, cannot fetch conversations');
        return;
      }
      
      const response = await fetch('/api/conversations', {
        credentials: 'include' // Include cookies for auth
      });
      
      if (response.status === 401) {
        // User needs to login again
        console.log('Auth session expired or unauthorized. Redirecting to login...');
        setConversations([]);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      
      const data = await response.json();
      
      // Process the conversations to add the participant property and calculate unread counts
      const processedConversations = data.conversations?.map((convo: Conversation) => {
        // Find the other participant (not the current user)
        const otherParticipant = convo.participants.find(
          p => p.user_id !== user.id
        )?.user;
        
        // Calculate unread count - a message is unread if:
        // 1. It's from another user
        // 2. It was sent after the last time the current user viewed the conversation
        let unreadCount = 0;
        
        // Find the current user's participant record to get last_viewed_at
        const currentUserParticipant = convo.participants.find(
          p => p.user_id === user.id
        );
        
        const lastViewedAt = currentUserParticipant?.last_viewed_at
          ? new Date(currentUserParticipant.last_viewed_at).getTime()
          : 0;

        // If there's a last message and it's not from the current user, check if it's unread
        if (convo.last_message && convo.last_message.sender_id !== user.id) {
          const messageTime = new Date(convo.last_message.created_at).getTime();
          if (messageTime > lastViewedAt) {
            unreadCount = 1; // We only count the most recent message for now
          }
        }
        
        return {
          ...convo,
          participant: otherParticipant,
          unreadCount
        };
      }) || [];
      
      // Create temporary conversation objects for any temp conversations
      const tempConvs = createTemporaryConversationObjects();
      
      // Merge temp conversations with real ones, avoiding any duplicates
      // Real conversations for the same tutor take priority over temp ones
      let mergedConversations = [...processedConversations];
      
      // Only add temp conversations for tutors that don't have a real conversation
      if (tempConvs.length > 0) {
        for (const tempConv of tempConvs) {
          const tutorId = tempConv.participant?.id;
          // Check if this tutor already has a real conversation
          const existingConvo = mergedConversations.find(convo => 
            convo.participants.some((p: { user_id: string }) => p.user_id === tutorId)
          );
          
          if (!existingConvo) {
            mergedConversations.push(tempConv);
          } else {
            console.log(`Not adding temp conversation for tutor ${tutorId} as real conversation exists`);
            
            // If there's a temporary conversation in localStorage for this tutor, remove it
            Object.keys(tempConversations).forEach(tempId => {
              if (tempConversations[tempId].tutorId === tutorId) {
                setTempConversations(prev => {
                  const newTemp = {...prev};
                  delete newTemp[tempId];
                  return newTemp;
                });
                console.log(`Removing stale temporary conversation ${tempId} for tutor ${tutorId}`);
              }
            });
          }
        }
      }
      
      // Update state with fresh data
      setConversations(sortConversations(mergedConversations));
      
      // Save to localStorage cache - only save real conversations
      saveToCache(CACHE_CONFIG.CONVERSATIONS_CACHE_KEY, processedConversations);
      console.log("Updated conversations cache in localStorage");
    };

    fetchConversations();
  }, [user, tempConversations, checkPremiumAccess, hasPremiumAccess, sortConversations]);

  // Load messages for a conversation
  const getMessages = useCallback(async (conversationId: string, forceRefresh = false) => {
    if (!user) return;
    
    // Skip API calls for temporary conversations
    if (isTempConversation(conversationId)) {
      console.log(`Skipping API call for temporary conversation: ${conversationId}`);
      setMessages(prev => {
        if (!prev[conversationId]) {
          return {
            ...prev,
            [conversationId]: [] // Initialize with empty array
          };
        }
        return prev;
      });
      setLoadingMessages(false);
      return;
    }
    
    // Check if we've already checked this conversation for this user and it failed
    // This prevents infinite loops for non-premium users
    const conversationKey = `${user.id}:${conversationId}`;
    if (checkedConversationsRef.current.has(conversationKey) && hasPremiumAccess === false) {
      // Already checked and user doesn't have access, so return silently without state updates
      return;
    }
    
    // Only verify premium access if:
    // 1. We don't have a cached result (hasPremiumAccess is null)
    // 2. OR the cache has expired
    // 3. OR user doesn't have premium access according to cache (we'll check again in case they upgraded)
    const now = Date.now();
    const needsAccessCheck = 
      hasPremiumAccess === null || 
      !premiumAccessCheckedRef.current || 
      (now - premiumAccessTimestampRef.current > PREMIUM_ACCESS_CACHE_TTL) ||
      hasPremiumAccess === false;
    
    // Use cached result if available and on messages page (where we've already verified access)
    let accessStatus = hasPremiumAccess;
    
    if (needsAccessCheck) {
      console.log('Checking premium access for messages...');
      accessStatus = await checkPremiumAccess();
    } else {
      console.log('Using cached premium access status:', accessStatus);
    }
    
    if (!accessStatus) {
      console.log(`User does not have premium access, skipping message fetch for conversation: ${conversationId}`);
      
      // Mark this conversation as checked to prevent future checks
      checkedConversationsRef.current.add(conversationKey);
      
      // Only update messages state if we don't already have an empty array for this conversation
      // This prevents unnecessary state updates that can cause re-renders
      setMessages(prev => {
        if (prev[conversationId]?.length === 0) {
          return prev; // Already have an empty array, no need to update state
        }
        
        // Initialize with empty array once for this conversation
        return {
          ...prev,
          [conversationId]: []
        };
      });
      
      setLoadingMessages(false);
      return;
    }
    
    // User has access, so clear from checked set in case access status changed
    checkedConversationsRef.current.delete(conversationKey);
    
    // Check if we already have cached messages that aren't expired
    const cachedData = messagesCacheRef.current[conversationId];
    
    if (!forceRefresh && 
        cachedData && 
        (now - cachedData.timestamp < MESSAGE_CACHE_TTL) && 
        messages[conversationId]?.length > 0) {
      console.log(`Using cached messages for conversation: ${conversationId}`);
      return; // Use cached data
    }
    
    try {
      setLoadingMessages(true);
      console.log(`Fetching messages for conversation: ${conversationId}`);
      
      // Determine if we need to fetch with pagination
      const currentMessages = messages[conversationId] || [];
      const limit = 50; // Default limit
      const paginationParam = currentMessages.length > 0 && forceRefresh ? 
        `&before=${currentMessages[0].id}&limit=${limit}` : 
        `&limit=${limit}`;
      
      const response = await fetch(`/api/messages?conversation_id=${conversationId}${paginationParam}`, {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        // Handle unauthorized
        console.log('Session expired or unauthorized for messages.');
        return;
      }
      
      if (response.status === 403 || response.status === 500) {
        // Likely not authorized for this conversation
        console.log(`Not authorized to access conversation: ${conversationId}`);
        
        // Add to checked conversations to prevent retries
        checkedConversationsRef.current.add(conversationKey);
        
        // If this is the selected conversation, clear it
        if (selectedConversationId === conversationId) {
          _setSelectedConversationId(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('selectedConversationId');
          }
        }
        
        // Remove this conversation from the list
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        
        // Remove messages for this conversation
        setMessages(prev => {
          const newMessages = {...prev};
          delete newMessages[conversationId];
          return newMessages;
        });
        
        setLoadingMessages(false);
        return;
      }
      
      if (!response.ok) {
        // Log more detailed information for debugging
        const errorText = await response.text();
        console.error(`Failed to fetch messages: Status ${response.status}`, errorText);
        throw new Error(`Failed to fetch messages: Status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update the messages state
      const newMessages = data.messages || [];
      setMessages(prev => {
        // If we're paginating, combine with existing messages
        const existingMessages = prev[conversationId] || [];
        
        // When refreshing, we need to deduplicate messages properly
        let combinedMessages = [];
        
        if (forceRefresh && existingMessages.length > 0) {
          // Paginating, add new messages to existing ones
          combinedMessages = [...newMessages, ...existingMessages];
        } else {
          // Fresh load, replace existing messages
          combinedMessages = [...newMessages];
        }
        
        // Deduplicate messages by ID to prevent duplicates
        const uniqueMessages = [];
        const messageIds = new Set();
        
        for (const msg of combinedMessages) {
          if (!messageIds.has(msg.id)) {
            messageIds.add(msg.id);
            uniqueMessages.push(msg);
          }
        }
        
        return {
          ...prev,
          [conversationId]: uniqueMessages
        };
      });
      
      // Cache the messages with timestamp
      messagesCacheRef.current[conversationId] = {
        data: newMessages,
        timestamp: now
      };
      
      // Check if we have the complete history 
      if (data.has_more && forceRefresh) {
        console.log(`There are more messages available for conversation ${conversationId}`);
        // For now, we don't automatically fetch more, but we could implement that if needed
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      
      // Return empty array instead of mock messages
      setMessages(prev => ({
        ...prev,
        [conversationId]: []
      }));
      
      // Cache the empty array
      messagesCacheRef.current[conversationId] = {
        data: [],
        timestamp: now
      };
    } finally {
      setLoadingMessages(false);
    }
  }, [user, isTempConversation, checkPremiumAccess, hasPremiumAccess]);
  
  // Add a function to force refresh messages when needed
  const refreshMessages = useCallback(async (conversationId: string) => {
    if (!conversationId || !user) return Promise.resolve();
    
    // Skip API calls for temporary conversations
    if (isTempConversation(conversationId)) {
      console.log(`Skipping API refresh for temporary conversation: ${conversationId}`);
      return Promise.resolve();
    }
    
    // Check if user has premium access before proceeding
    const accessStatus = await checkPremiumAccess();
    if (!accessStatus) {
      console.log(`User does not have premium access, skipping message refresh for conversation: ${conversationId}`);
      return Promise.resolve();
    }
    
    // We need to keep a reference to this specific request to avoid race conditions
    const requestId = `refresh-${Date.now()}-${Math.random().toString().slice(2, 8)}`;
    
    console.log(`[${requestId}] Refreshing messages for conversation: ${conversationId}`);
    
    try {
      // Check if we already have messages for this conversation
      const existingMessages = messages[conversationId] || [];
      
      if (existingMessages.length > 0) {
        // We already have messages - only refresh if they're older than the cache TTL
        const cachedData = messagesCacheRef.current[conversationId];
        const now = Date.now();
        
        if (cachedData && (now - cachedData.timestamp < MESSAGE_CACHE_TTL)) {
          console.log(`[${requestId}] Using cached messages for conversation: ${conversationId}`);
          return Promise.resolve(); // Use cached data
        }
        
        // Cache is expired or doesn't exist
        console.log(`[${requestId}] Cache expired, refreshing messages for conversation: ${conversationId}`);
      } else {
        console.log(`[${requestId}] No existing messages, fetching for conversation: ${conversationId}`);
      }
      
      // Pass forceRefresh=false to replace existing messages rather than paginating
      // This ensures we don't duplicate messages
      return await getMessages(conversationId, false);
    } catch (error) {
      console.error(`[${requestId}] Error refreshing messages:`, error);
      return Promise.resolve(); // Always resolve to avoid unhandled rejections
    }
  }, [getMessages, user, MESSAGE_CACHE_TTL, isTempConversation, checkPremiumAccess, hasPremiumAccess]);
  
  // Reset checked conversations when premium access status changes
  useEffect(() => {
    // Clear the checked conversations set when premium access status changes
    // This ensures we'll re-check conversations if the user upgrades
    checkedConversationsRef.current.clear();
  }, [hasPremiumAccess]);
  
  // Automatically load messages when conversation changes, but ONLY if not already loaded
  useEffect(() => {
    if (selectedConversationId) {
      // Check if we've already marked this conversation as checked for a non-premium user
      const conversationKey = user?.id ? `${user.id}:${selectedConversationId}` : '';
      
      // Skip loading if:
      // 1. We've already checked this conversation and user doesn't have premium access
      // 2. OR this is a temporary conversation (handled separately)
      if (
        (conversationKey && 
         checkedConversationsRef.current.has(conversationKey) && 
         hasPremiumAccess === false) ||
        isTempConversation(selectedConversationId)
      ) {
        // Skip loading messages to prevent unnecessary API calls
        return;
      }
      
      // If we already have premium access (cached) and we're just switching conversations,
      // load messages without rechecking premium status
      getMessages(selectedConversationId);
    }
  }, [selectedConversationId, getMessages, user?.id, hasPremiumAccess, isTempConversation]);

  // Modify the sendMessage function to handle temp conversations
  const sendMessage = useCallback(async (conversationId: string, content: string, options?: { maxRetries?: number }) => {
    if (!user) throw new Error('Not authenticated');
    
    // Validate conversation ID - this is where the error was happening
    if (!conversationId || typeof conversationId !== 'string' || conversationId.trim() === '') {
      throw new Error('Conversation ID is required');
    }
    
    // Check premium access for non-temporary conversations
    if (!conversationId.startsWith('temp-')) {
      const accessStatus = await checkPremiumAccess();
      if (!accessStatus) {
        throw new Error('Premium access required to send messages');
      }
    }
    
    // If this is a temporary conversation, pre-fetch the CSRF token to avoid 403 errors
    if (isTempConversation(conversationId)) {
      console.log('Temporary conversation detected, ensuring CSRF token is available...');
      try {
        await fetchCsrfToken();
      } catch (error) {
        console.warn('Pre-fetch of CSRF token failed, will try again during conversation creation:', error);
      }
    }
    
    const maxRetries = options?.maxRetries || 2;
    let lastError: any = null;
    
    // Create a temporary ID for optimistic updates
    const tempId = `temp-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date();
    
    // Create the optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      sender_id: user.id,
      content,
      timestamp,
      read: true,
      created_at: timestamp.toISOString(),
      conversation_id: conversationId,
      status: 'sending',
      sender: {
        id: user.id,
        display_name: user.name || 'You',
        avatar_url: user.profilePic || user.avatar_url || null,
        is_tutor: user.role === 'tutor'
      }
    };
    
    // Check if this is a temporary conversation that needs to be created
    const isTemp = isTempConversation(conversationId);
    let actualConversationId = conversationId;
    let verificationSuccessful = false;
    
    // Add to messages immediately for optimistic UI update
    setMessages(prev => {
      const conversationMessages = [...(prev[conversationId] || [])];
      
      // Add the optimistic message to the end of the array
      conversationMessages.push(optimisticMessage);
      
      return {
        ...prev,
        [conversationId]: conversationMessages
      };
    });
    
    // If this is a temporary conversation, we need to create a real one first
    if (isTemp) {
      try {
        console.log(`Creating real conversation from temporary conversation ${conversationId}`);
        
        const tempDetails = tempConversations[conversationId];
        if (!tempDetails) {
          throw new Error('Temporary conversation details not found');
        }
        
        // Create the real conversation
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add CSRF token to the headers
            [CSRF_HEADER_NAME]: getCsrfTokenFromStorage() || ''
          },
          body: JSON.stringify({
            participant_id: tempDetails.tutorId
          }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create conversation');
        }
        
        const responseData = await response.json();
        
        if (!responseData.conversation_id) {
          throw new Error('No conversation ID returned');
        }
        
        // Store the real conversation ID from Supabase
        actualConversationId = responseData.conversation_id;
        console.log(`Created real conversation with ID: ${actualConversationId}`);
        
        // Check if the conversation is ready using the dedicated endpoint
        verificationSuccessful = await verifyConversationReady(actualConversationId);
      } catch (error) {
        console.error('Error creating real conversation:', error);
        
        // Check specifically for CSRF errors
        const isCsrfError = error instanceof Error && 
          (error.message.includes('CSRF') || error.message.includes('csrf'));
        
        if (isCsrfError) {
          // Attempt to fetch a fresh CSRF token if this was a CSRF error
          try {
            console.log('CSRF token error detected, attempting to refresh token...');
            await fetchCsrfToken();
            throw new Error('CSRF token error - please try again. The token has been refreshed.');
          } catch (refreshError) {
            console.error('Failed to refresh CSRF token:', refreshError);
            throw new Error('CSRF token validation failed. Please refresh the page and try again.');
          }
        }
        
        // Update message status to error
        setMessages(prev => {
          const conversationMessages = [...(prev[conversationId] || [])];
          const messageIndex = conversationMessages.findIndex(msg => msg.id === tempId);
          
          if (messageIndex >= 0) {
            conversationMessages[messageIndex] = {
              ...conversationMessages[messageIndex],
              status: 'error',
              content: content + ' (Failed to create conversation)'
            };
          }
          
          return { ...prev, [conversationId]: conversationMessages };
        });
        
        throw error;
      }
    }
    
    // Try sending the message with retries
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // If this is a retry attempt, wait before trying again with exponential backoff
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt}/${maxRetries} for sending message to conversation ${actualConversationId}`);
          
          // For new conversations that weren't verified successfully, use longer delays
          const isNewUnverifiedConversation = isTemp && !verificationSuccessful;
          const baseDelay = isNewUnverifiedConversation ? 2000 : 1000;
          const retryDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), 8000); // Max 8 seconds delay
          
          console.log(`Waiting ${retryDelay}ms before retry attempt`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          // Update message status to show retrying
          setMessages(prev => {
            const conversationMessages = [...(prev[conversationId] || [])];
            const messageIndex = conversationMessages.findIndex(msg => msg.id === tempId);
            if (messageIndex >= 0) {
              conversationMessages[messageIndex] = {
                ...conversationMessages[messageIndex],
                status: 'sending',
                content: content + (attempt === maxRetries ? ' (Final retry...)' : ' (Retrying...)')
              };
            }
            return { ...prev, [conversationId]: conversationMessages };
          });
        }
      
        // Make the API request with the actual conversation ID
        const csrfToken = getCsrfTokenFromStorage();
        
        // Add CSRF token to the headers for non-GET requests
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        // Include CSRF token if available
        if (csrfToken) {
          headers[CSRF_HEADER_NAME] = csrfToken;
        } else {
          console.warn('CSRF token not found. This request might fail due to CSRF protection.');
        }
        
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify({ conversation_id: actualConversationId, content }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          lastError = new Error(errorData.error || 'Failed to send message');
          throw lastError;
        }
        
        // Get the server message from the response
        const serverMessage: Message = await response.json();
        
        // Message sent successfully - now we can store it in localStorage for notifications
        // Only do this for first messages in newly created conversations
        if (isTemp) {
          try {
            // Create a notification-friendly message object with all required fields
            const notificationMessage = {
              ...serverMessage,
              conversation_id: actualConversationId,
              id: serverMessage.id || `${tempId}-real`,
              content: content,
              _notificationTimestamp: Date.now(),
              sender: {
                id: user.id,
                display_name: user.name || 'You',
                avatar_url: user.profilePic || user.avatar_url || null,
                is_tutor: user.role === 'tutor'
              },
              // Add recipient info for the notification system
              recipient: tempConversations[conversationId] ? {
                id: tempConversations[conversationId].tutorId,
                display_name: tempConversations[conversationId].tutorName || 'Tutor',
                avatar_url: tempConversations[conversationId].tutorAvatar || null,
                is_tutor: true
              } : undefined,
              // Add any fields the notification system needs
              created_at: serverMessage.created_at || new Date().toISOString(),
              sender_id: user.id
            };
            
            if (typeof window !== 'undefined') {
              // Store for notifications in this tab
              localStorage.setItem('first_message', JSON.stringify(notificationMessage));
              
              // Also store in latest_message to trigger the RealtimeContext notification system
              localStorage.setItem('latest_message', JSON.stringify(notificationMessage));
              
              console.log('Stored first message for notification systems after successful send', notificationMessage);
            }
            
            // Remove the temporary conversation from storage since we now have a real conversation
            setTempConversations(prev => {
              const newTempConversations = { ...prev };
              delete newTempConversations[conversationId];
              
              // Update localStorage to remove the temp conversation
              try {
                localStorage.setItem('tempConversations', JSON.stringify(newTempConversations));
              } catch (e) {
                console.error('Failed to update temporary conversations in localStorage:', e);
              }
              
              return newTempConversations;
            });
            
            // Store a mapping from temp ID to real ID to help with redirects
            const conversionMap = JSON.parse(localStorage.getItem('tempToRealConversions') || '{}');
            conversionMap[conversationId] = actualConversationId;
            localStorage.setItem('tempToRealConversions', JSON.stringify(conversionMap));
            
            // Immediately remove the temporary conversation from the UI
            setConversations(prevConversations => {
              // Filter out the temp conversation
              const filteredConvos = prevConversations.filter(convo => convo.id !== conversationId);
              
              // Make sure the real conversation is included
              const hasRealConvo = filteredConvos.some(convo => convo.id === actualConversationId);
              if (!hasRealConvo) {
                // If we don't have the real conversation yet, we'll add a placeholder
                // It will be replaced with the real data when fetchFreshConversations runs
                const tempDetails = tempConversations[conversationId];
                const placeholderConvo: Conversation = {
                  id: actualConversationId,
                  participants: [
                    {
                      user_id: user.id,
                      user: {
                        id: user.id,
                        display_name: user.name || 'You',
                        first_name: user.name?.split(' ')[0] || '',
                        last_name: user.name?.split(' ')[1] || '',
                        avatar_url: user.profilePic || user.avatar_url || null,
                        is_tutor: user.role === 'tutor'
                      }
                    },
                    {
                      user_id: tempDetails.tutorId,
                      user: {
                        id: tempDetails.tutorId,
                        display_name: tempDetails.tutorName,
                        first_name: tempDetails.tutorName.split(' ')[0] || '',
                        last_name: tempDetails.tutorName.split(' ')[1] || '',
                        avatar_url: tempDetails.tutorAvatar || null,
                        is_tutor: true
                      }
                    }
                  ],
                  unreadCount: 0,
                  participant: {
                    id: tempDetails.tutorId,
                    display_name: tempDetails.tutorName,
                    first_name: tempDetails.tutorName.split(' ')[0] || '',
                    last_name: tempDetails.tutorName.split(' ')[1] || '',
                    avatar_url: tempDetails.tutorAvatar || null,
                    is_tutor: true
                  },
                  last_message: {
                    id: serverMessage.id,
                    content: serverMessage.content,
                    created_at: serverMessage.created_at || new Date().toISOString(),
                    sender_id: user.id
                  },
                  last_message_at: serverMessage.created_at || new Date().toISOString()
                };
                return sortConversations([placeholderConvo, ...filteredConvos]);
              }
              
              return sortConversations(filteredConvos);
            });
            
            // Change the selected conversation to the real conversation
            setSelectedConversationId(actualConversationId);
            
            // Only redirect if we're viewing this specific conversation
            if (typeof window !== 'undefined' && 
                window.location.pathname.includes('/dashboard/messages') &&
                selectedConversationId === conversationId) {
              // Update the URL without causing a page reload
              window.history.replaceState(
                {}, 
                '', 
                `/dashboard/messages?conversationId=${actualConversationId}`
              );
              
              console.log(`Redirected temporary conversation ${conversationId} to real conversation ${actualConversationId}`);
            } else {
              console.log(`Converted temporary conversation ${conversationId} to real conversation ${actualConversationId} without redirect`);
            }
          } catch (error) {
            console.error('Error handling conversation redirection:', error);
          }
        }
        
        // Update the messages state with the server response
        setMessages(prev => {
          const conversationMessages = [...(prev[conversationId] || [])];
          
          // Find the temporary message
          const messageIndex = conversationMessages.findIndex(msg => msg.id === tempId);
          
          // Create helper function to deduplicate messages by ID
          const ensureUniqueIds = (messages: Message[]): Message[] => {
            const seen = new Set<string>();
            return messages.filter(msg => {
              if (seen.has(msg.id)) return false;
              seen.add(msg.id);
              return true;
            });
          };
          
          if (messageIndex >= 0) {
            // Important: Instead of replacing the message, update it in-place
            // This preserves React component identity and prevents visible UI changes
            conversationMessages[messageIndex] = {
              // Start with the original optimistic message to keep any UI state
              ...conversationMessages[messageIndex],
              // Apply server properties but keep the same position in the array
              ...serverMessage,
              // Explicitly set status to 'sent' to update UI
              status: 'sent' as 'sending' | 'sent' | 'delivered' | 'error',
            };
            
            // Check for any other messages with the same server ID (duplicates)
            const duplicateIndex = conversationMessages.findIndex(
              (msg, idx) => idx !== messageIndex && msg.id === serverMessage.id
            );
            
            if (duplicateIndex >= 0) {
              // Remove the duplicate
              conversationMessages.splice(duplicateIndex, 1);
            }
          } else {
            // This shouldn't normally happen, but handle the case anyway
            // First check if this server message ID already exists
            const existingServerMsg = conversationMessages.findIndex(msg => msg.id === serverMessage.id);
            
            if (existingServerMsg >= 0) {
              // Update the existing message instead of adding a new one
              conversationMessages[existingServerMsg] = {
                ...conversationMessages[existingServerMsg],
                ...serverMessage,
                status: 'sent' as 'sending' | 'sent' | 'delivered' | 'error'
              };
            } else {
              // Add as a new message
              conversationMessages.push({
                ...serverMessage,
                status: 'sent' as 'sending' | 'sent' | 'delivered' | 'error'
              });
            }
          }
          
          // Deduplicate final array by ID
          const uniqueMessages = ensureUniqueIds(conversationMessages);
          
          return {
            ...prev,
            [conversationId]: uniqueMessages
          };
        });
        
        // Update the conversation's last message
        setConversations(prev => {
          // First find the conversation to update
          const conversationToUpdate = prev.find(convo => convo.id === actualConversationId);
          
          if (!conversationToUpdate) {
            // If the conversation doesn't exist in the list, keep the list as is
            return prev;
          }
          
          // Update the conversation with the new last message
          const updatedConversation = {
            ...conversationToUpdate,
            last_message: {
              id: serverMessage.id,
              content: serverMessage.content,
              created_at: serverMessage.created_at || new Date().toISOString(),
              sender_id: user.id
            },
            last_message_at: serverMessage.created_at || new Date().toISOString()
          };
          
          // Remove the conversation from the current position
          const filteredConversations = prev.filter(convo => convo.id !== actualConversationId);
          
          // Return a new array with the updated conversation at the top with proper sorting
          return sortConversations([updatedConversation, ...filteredConversations]);
        });
        
        // Successfully sent the message, return it with status explicitly set
        return {
          ...serverMessage,
          status: 'sent' as 'sending' | 'sent' | 'delivered' | 'error'
        };
      } catch (error) {
        console.error(`Error sending message (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
        
        // If this was the last retry attempt, mark as error
        if (attempt === maxRetries) {
          // Mark the optimistic message as error
          setMessages(prev => {
            const conversationMessages = [...(prev[conversationId] || [])];
            
            // Find the optimistic message
            const messageIndex = conversationMessages.findIndex(msg => msg.id === tempId);
            
            if (messageIndex >= 0) {
              // Create an appropriate error message
              let errorMessage = ' (Failed to send)';
              
              // More specific error messages for common issues
              if (error instanceof Error) {
                if (error.message.includes('conversation')) {
                  errorMessage = ' (Conversation creation failed, please try again)';
                } else if (error.message.includes('network') || error.message.includes('timeout')) {
                  errorMessage = ' (Network error, please check your connection)';
                }
              }
              
              // Mark as error
              conversationMessages[messageIndex] = {
                ...conversationMessages[messageIndex],
                status: 'error',
                content: content + errorMessage
              };
            }
            
            return {
              ...prev,
              [conversationId]: conversationMessages
            };
          });
          
          throw error; // Re-throw the last error
        }
        // Otherwise continue to the next retry attempt
      }
    }
    
    // This should never be reached due to the return or throw above
    throw lastError || new Error('Failed to send message after retries');
  }, [user, isTempConversation, checkPremiumAccess, hasPremiumAccess, setMessages, setConversations, tempConversations, updateMessageStatus, sortConversations]);
  
  // Set active conversation - convenience function that aliases setSelectedConversationId
  const setActiveConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
  }, [setSelectedConversationId]);

  // Add CSRF token management
  const { fetchCsrfToken } = useCsrfToken();
  const csrfFetchedRef = useRef(false);
  
  // Add effect to fetch CSRF token when needed
  useEffect(() => {
    if (!csrfFetchedRef.current && user) {
      console.log('Fetching CSRF token for MessageProvider...');
      fetchCsrfToken().then(token => {
        if (token) {
          console.log('CSRF token fetched successfully');
        } else {
          console.warn('Failed to fetch CSRF token, requests requiring CSRF might fail');
        }
        csrfFetchedRef.current = true;
      }).catch(error => {
        console.error('Error fetching CSRF token:', error);
      });
    }
  }, [fetchCsrfToken, user]);

  // Add a cleanup function for temp conversations at the end of the useEffect for tempConversations
  // Effect to save tempConversations to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (Object.keys(tempConversations).length > 0) {
          localStorage.setItem('tempConversations', JSON.stringify(tempConversations));
        } else {
          // Clean up if no temp conversations
          localStorage.removeItem('tempConversations');
        }
      } catch (e) {
        console.error('Failed to save temporary conversations to localStorage:', e);
      }
    }
    
    // Clean up function to run on unmount
    return () => {
      if (typeof window !== 'undefined') {
        // Check for and remove any stale conversations
        try {
          const stored = localStorage.getItem('tempConversations');
          if (stored) {
            const parsed = JSON.parse(stored);
            const now = Date.now();
            let hasChanges = false;
            
            Object.keys(parsed).forEach(key => {
              const createdAtDate = new Date(parsed[key].createdAt);
              const age = now - createdAtDate.getTime();
              
              if (age > TEMP_CONVERSATION_EXPIRY_MS) {
                delete parsed[key];
                hasChanges = true;
                console.log(`Cleanup: Removing expired temporary conversation ${key}`);
              }
            });
            
            if (hasChanges) {
              if (Object.keys(parsed).length > 0) {
                localStorage.setItem('tempConversations', JSON.stringify(parsed));
              } else {
                localStorage.removeItem('tempConversations');
              }
            }
          }
        } catch (e) {
          console.error('Error during temp conversation cleanup:', e);
        }
      }
    };
  }, [tempConversations]);
  
  return (
    <MessageContext.Provider value={{
      conversations,
      messages,
      selectedConversationId,
      setSelectedConversationId,
      currentConversation,
      sendMessage,
      markConversationAsRead,
      loading,
      loadingMessages,
      hasUnreadMessages,
      setActiveConversation,
      handleRealtimeMessage,
      refreshMessages,
      typingStates,
      setUserTyping,
      isUserTyping,
      handleTypingState,
      pageVisibility,
      createTempConversation,
      isTempConversation,
    }}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (context === null) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};