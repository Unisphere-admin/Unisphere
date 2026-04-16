import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMessages } from '@/context/MessageContext';
import { useAuth } from '@/context/AuthContext';

interface Conversation {
  id: string;
  unreadCount?: number;
  participants?: Array<{
    user_id: string;
    last_viewed_at?: string;
  }>;
  last_message?: {
    sender_id: string;
    created_at: string;
  };
}

interface Message {
  id: string;
  sender_id: string;
  created_at: string;
  conversation_id: string;
  content: string;
}

/**
 * Hook to track unread messages count across all conversations
 * @returns The total number of unread messages
 */
export function useUnreadCount(): number {
  const messageContext = useMessages();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  // Safely access context properties with optional chaining
  const conversations = messageContext?.conversations || [];
  const messages = messageContext?.messages || {};
  const hasUnreadMessages = messageContext?.hasUnreadMessages || (() => false);
  const pageVisibility = messageContext?.pageVisibility || {
    isVisible: true,
    isFocused: true,
    currentPath: '',
    isOnMessagesPage: false
  };
  
  // Calculate total unread messages across all conversations
  const calculateUnreadCount = useCallback(() => {
    if (!conversations || conversations.length === 0) {
      return 0;
    }
    
    // Sum up unread messages across all conversations
    return (conversations as any[]).reduce((total: number, conversation: any) => {
      // Check if this conversation has unread messages
      const hasUnread = hasUnreadMessages(conversation.id);
      
      if (hasUnread) {
        // Get the conversation's messages
        const conversationMessages = messages[conversation.id] || [];
        
        if (conversationMessages.length > 0) {
          // Find the user's participant record to get last_viewed_at timestamp
          const currentUserParticipant = conversation.participants?.find(
            (p: any) => p.user_id === user?.id
          );
          const lastViewedAt = currentUserParticipant?.last_viewed_at;
          
          if (!lastViewedAt) {
            // If no last_viewed_at, count all messages not from the current user
            const unreadInConversation = conversationMessages.filter(
              (msg: any) => msg.sender_id !== user?.id
            ).length;
            return total + unreadInConversation;
          } else {
            // Count messages after the last_viewed_at timestamp and not from current user
            const lastViewedTime = new Date(lastViewedAt).getTime();
            const unreadInConversation = conversationMessages.filter((msg: any) => {
              const messageTime = new Date(msg.created_at || msg.timestamp).getTime();
              return messageTime > lastViewedTime && msg.sender_id !== user?.id;
            }).length;
            return total + unreadInConversation;
          }
        } else if (conversation.unreadCount && conversation.unreadCount > 0) {
          // If we don't have messages loaded but have an unreadCount, use that
          return total + conversation.unreadCount;
        } else {
          // Fallback to adding 1 for the conversation
          return total + 1;
        }
      }
      
      return total;
    }, 0);
  }, [conversations, hasUnreadMessages, messages, user?.id]);
  
  // Update unread count only when conversations or messages actually change
  // (page visibility changes don't affect the count itself)
  useEffect(() => {
    const count = calculateUnreadCount();
    setUnreadCount(count);
  }, [conversations, messages, calculateUnreadCount]);
  
  // Listen for local storage events to detect message updates in other tabs
  useEffect(() => {
    // Function to handle storage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'latest_message') {
        // Force recalculation of unread count when a new message arrives
        const count = calculateUnreadCount();
        setUnreadCount(count);
      }
    };
    
    // Add event listener
    window.addEventListener('storage', handleStorageChange);
    
    // Clean up
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [calculateUnreadCount]);
  
  return unreadCount;
} 