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
      if ((e.key === 'latest_message' || e.key === 'first_message') && pageVisibilityRef.current && user) {
        try {
          const messageData = JSON.parse(e.newValue || '{}');
          
          // Skip if no valid data
          if (!messageData || !messageData.id || !messageData.conversation_id) {
            return;
          }
          
          // Skip if we've already shown a notification for this message
          if (messageData.id === lastShownMessageId) return;
          
          // Don't show notifications for messages from the current user
          if (messageData.sender_id === user.id) return;
          
          // Don't show notification if already on messages page with the relevant conversation selected
          if (isOnMessagesPage && selectedConversationId === messageData.conversation_id) {
            console.log("Skipping notification - user is already viewing conversation", messageData.conversation_id);
            return;
          }
          
          // Update last shown message
          setLastShownMessageId(messageData.id);
          
          // Get sender name with fallback
          const senderName = messageData.sender?.display_name || 'Someone';
          
          // Create the notification
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
          
          // If this was a first_message, clear it from localStorage to prevent duplicates
          if (e.key === 'first_message' && typeof window !== 'undefined') {
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