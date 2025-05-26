"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMessages } from '@/context/MessageContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { ToastAction } from '@/components/ui/toast';

// Notification settings
const DEBOUNCE_TIME = 1000; // 1000ms

export function MessageNotification() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [lastShownMessageId, setLastShownMessageId] = useState<string | null>(null);
  const pageVisibilityRef = useRef<boolean>(true);
  const isOnMessagesPage = pathname === '/dashboard/messages';
  const messageContext = useMessages();
  const selectedConversationId = messageContext?.selectedConversationId;
  
  useEffect(() => {
    // Update visibility state when the page visibility changes
    const handleVisibilityChange = () => {
      pageVisibilityRef.current = document.visibilityState === 'visible';
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only respond to 'first_message' to avoid duplicates with RealtimeContext
      if (e.key === 'first_message' && pageVisibilityRef.current && user) {
        try {
          const messageData = JSON.parse(e.newValue || '{}');
          
          // Skip if no valid data
          if (!messageData || !messageData.id || !messageData.conversation_id) {
            return;
          }
          
          // Skip if we've already shown a notification for this message
          if (messageData.id === lastShownMessageId) return;
          
          // For new conversations, we need to handle both sender and recipient cases
          const isSender = messageData.sender_id === user.id;
          
          // Show notification differently based on whether the user is the sender or recipient
          // If user is sender, show confirmation that message was sent to recipient
          // If user is recipient, show notification about new message
          
          // For the sender (the person who initiated the conversation)
          if (isSender) {
            // Only show notification if they're not already on the messages page viewing this conversation
            if (isOnMessagesPage && selectedConversationId === messageData.conversation_id) {
              console.log("Skipping sender notification - already viewing conversation", messageData.conversation_id);
              return;
            }
            
            // Get recipient information from the message if available
            const recipientName = messageData.recipient?.display_name || 
                                (messageData.recipient?.first_name && messageData.recipient?.last_name ? 
                                 `${messageData.recipient.first_name} ${messageData.recipient.last_name}` : 
                                 'the recipient');
            
            // Create a confirmation notification
            toast({
              title: 'Message sent',
              description: `Your message has been sent to ${recipientName}`,
              action: (
                <ToastAction 
                  altText="View" 
                  onClick={() => { 
                    router.push(`/dashboard/messages?conversationId=${messageData.conversation_id}`);
                  }}
                >
                  View
                </ToastAction>
              ),
            });
          } else {
            // For recipients, only show if not already viewing this conversation
            if (isOnMessagesPage && selectedConversationId === messageData.conversation_id) {
              console.log("Skipping recipient notification - already viewing conversation", messageData.conversation_id);
              return;
            }
            
            // Update last shown message
            setLastShownMessageId(messageData.id);
            
            // Get sender name with fallback
            const senderName = messageData.sender?.display_name || 
                              (messageData.sender?.first_name && messageData.sender?.last_name ? 
                               `${messageData.sender.first_name} ${messageData.sender.last_name}` : 
                               'Someone');
            
            // Create the notification for recipient
            toast({
              title: `Message from ${senderName}`,
              description: messageData.content,
              action: (
                <ToastAction 
                  altText="View" 
                  onClick={() => { 
                    router.push(`/dashboard/messages?conversationId=${messageData.conversation_id}`);
                  }}
                >
                  View
                </ToastAction>
              ),
            });
          }
          
          // Clear from localStorage to prevent duplicates
          if (typeof window !== 'undefined') {
            localStorage.removeItem('first_message');
          }
        } catch (error) {
          console.error('Error handling message notification:', error);
        }
      }
    };
    
    // Listen for the storage event (works across tabs)
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [toast, user, router, lastShownMessageId, isOnMessagesPage, selectedConversationId]);
  
  return null;
} 