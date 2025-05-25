"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { createClient } from "@/utils/supabase/client";
import { getFromCache, saveToCache, CACHE_CONFIG } from "@/lib/caching";
import { useRouter } from "next/navigation";

export interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  content: string;
  timestamp: Date;
  read: boolean;
  sessionRequest?: SessionRequest | null;
  created_at?: string;
  conversation_id?: string;
  sender?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_tutor: boolean;
  };
  status?: 'sending' | 'sent' | 'delivered' | 'error';
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
          Object.keys(parsed).forEach(key => {
            parsed[key].createdAt = new Date(parsed[key].createdAt);
          });
          return parsed;
        }
      } catch (e) {
        console.error('Failed to load temporary conversations from localStorage:', e);
      }
    }
    return {};
  });

  // Effect to save tempConversations to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(tempConversations).length > 0) {
      try {
        localStorage.setItem('tempConversations', JSON.stringify(tempConversations));
      } catch (e) {
        console.error('Failed to save temporary conversations to localStorage:', e);
      }
    }
  }, [tempConversations]);

  // Check if a conversation is temporary
  const isTempConversation = useCallback((conversationId: string) => {
    return conversationId.startsWith('temp-') && Boolean(tempConversations[conversationId]);
  }, [tempConversations]);
  
  // Check if user has premium access
  const checkPremiumAccess = useCallback(async () => {
    if (!user) {
      return false;
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
      return data.user?.role === 'tutor' || data.user?.has_access === true;
    } catch (error) {
      console.error('Error checking user premium access:', error);
      return false;
    }
  }, [user]);

  // Create a temporary conversation
  const createTempConversation = useCallback((tutorId: string, tutorName: string, tutorAvatar?: string | null) => {
    if (!user) throw new Error('Not authenticated');

    // Check if a conversation already exists with this tutor
    const existingConversation = conversations.find(conv => 
      conv.participants.some(p => p.user_id === tutorId)
    );
    
    if (existingConversation) {
      console.log(`Using existing conversation ${existingConversation.id} with tutor ${tutorId}`);
      return existingConversation.id;
    }

    // Check if a temporary conversation already exists with this tutor
    const existingTempConv = Object.entries(tempConversations).find(([_, conv]) => 
      conv.tutorId === tutorId
    );

    if (existingTempConv) {
      console.log(`Using existing temporary conversation ${existingTempConv[0]} with tutor ${tutorId}`);
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
      
      // Make API call to mark as read
      const response = await fetch(`/api/conversations/${conversationId}/mark-read`, {
        method: 'POST',
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
      // Using fetch to broadcast typing status without needing the Realtime context here
      fetch('/api/typing-indicator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
  
  // Handle realtime messages
  const handleRealtimeMessage = useCallback((message: Message) => {
    if (!message || !message.conversation_id) return;
    
    // Update conversation messages when a new message arrives
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
  }, [updateMessageStatus, user?.id]);

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
            setConversations([...tempConvs, ...cachedConversations]);
          } else {
          setConversations(cachedConversations);
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
          setConversations(tempConvs);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
        // Don't use mock conversations as fallback anymore
        // Just use empty array or temporary conversations
        const tempConvs = createTemporaryConversationObjects();
        setConversations(tempConvs);
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
        
        // Find current user's participant record to get last_viewed_at
        const currentUserParticipant = convo.participants.find(
          p => p.user_id === user.id
        );
        
        // Calculate number of unread messages based on last_viewed_at
        // Note: This unreadCount will be updated by API or recalculated when messages are loaded
        let unreadCount = convo.unreadCount || 0;

        // If the last_message exists and the last_viewed_at is older than the last_message's created_at,
        // consider this conversation to have an unread message
        if (convo.last_message && currentUserParticipant?.last_viewed_at) {
          const lastViewedAt = new Date(currentUserParticipant.last_viewed_at).getTime();
          const lastMessageAt = new Date(convo.last_message.created_at).getTime();
          
          if (lastMessageAt > lastViewedAt && convo.last_message.sender_id !== user.id) {
            unreadCount = 1;
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
          }
        }
      }
      
      // Update state with fresh data
      setConversations(mergedConversations);
      
      // Save to localStorage cache - only save real conversations
      saveToCache(CACHE_CONFIG.CONVERSATIONS_CACHE_KEY, processedConversations);
      console.log("Updated conversations cache in localStorage");
    };

    fetchConversations();
  }, [user, tempConversations, checkPremiumAccess, hasPremiumAccess]);

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
    
    // Check if user has premium access before making API calls
    const accessStatus = await checkPremiumAccess();
    
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
    const now = Date.now();
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
      if (
        conversationKey && 
        checkedConversationsRef.current.has(conversationKey) && 
        hasPremiumAccess === false
      ) {
        // Already checked and user doesn't have access, so skip to prevent infinite loops
        return;
      }
      
      getMessages(selectedConversationId);
    }
  }, [selectedConversationId, getMessages, user?.id, hasPremiumAccess]);

  // Modify the sendMessage function to handle temp conversations
  const sendMessage = useCallback(async (conversationId: string, content: string, options?: { maxRetries?: number }) => {
    if (!user) throw new Error('Not authenticated');
    
    // Check premium access for non-temporary conversations
    if (!conversationId.startsWith('temp-')) {
      const accessStatus = await checkPremiumAccess();
      if (!accessStatus) {
        throw new Error('Premium access required to send messages');
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
            'Content-Type': 'application/json'
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
        
        // Ensure first message is properly handled for notification
        // By storing the message in localStorage, which will trigger notification in other tabs
        // This will now be done AFTER successful message sending to prevent false notifications
        
        // Wait for the conversation to be properly registered
        const maxRetries = 5;
        for (let retry = 0; retry < maxRetries; retry++) {
          // Increasing delay starting at 400ms, exponentially increasing
          const delay = 400 * Math.pow(1.5, retry);
          
          // Wait for the conversation to be properly registered
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Verify access to the conversation
          try {
            const checkResponse = await fetch(`/api/messages?conversation_id=${actualConversationId}`, {
              credentials: 'include'
            });
            
            if (checkResponse.ok) {
              // We have access - conversation is ready
              console.log("Conversation access verified successfully");
              break;
            } else if (retry === maxRetries - 1) {
              // Last retry and still failing
              throw new Error("Unable to access conversation after multiple attempts. Please try again later.");
            }
          } catch (verifyError) {
            if (retry === maxRetries - 1) {
              throw new Error("Unable to access conversation. Please try again later.");
            }
          }
        }
      } catch (error) {
        console.error('Error creating real conversation:', error);
        
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
          const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds delay
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
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
            const optimisticMessageWithRealId = {
              ...optimisticMessage,
              conversation_id: actualConversationId,
              id: `${tempId}-real`,
              _notificationTimestamp: Date.now()
            };
            
            if (typeof window !== 'undefined') {
              localStorage.setItem('first_message', JSON.stringify(optimisticMessageWithRealId));
              console.log('Stored first message for notification after successful send');
            }
          } catch (error) {
            console.error('Error storing first message for notification:', error);
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
        setConversations(prev => 
          prev.map(convo => 
            convo.id === actualConversationId
              ? {
                  ...convo,
                  last_message: {
                    id: serverMessage.id,
                    content: serverMessage.content,
                    created_at: serverMessage.created_at || new Date().toISOString(),
                    sender_id: user.id
                  },
                  last_message_at: serverMessage.created_at || new Date().toISOString()
                }
              : convo
          )
        );
        
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
              // Mark as error
              conversationMessages[messageIndex] = {
                ...conversationMessages[messageIndex],
                status: 'error',
                content: content + ' (Failed to send)'
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
  }, [user, isTempConversation, checkPremiumAccess, hasPremiumAccess, setMessages, setConversations, tempConversations, updateMessageStatus]);
  
  // Set active conversation - convenience function that aliases setSelectedConversationId
  const setActiveConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
  }, [setSelectedConversationId]);
  
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