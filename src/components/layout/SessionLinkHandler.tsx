"use client";

import { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useMessages } from '@/context/MessageContext';
import { useSessions } from '@/context/SessionContext';

/**
 * SessionLinkHandler component that provides global handling of session/message links
 * to automatically redirect to the messages page if needed.
 * 
 * This component should be placed near the root of your application to handle
 * any session links regardless of the current page.
 */
export function SessionLinkHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { sessions } = useSessions();
  
  // Get query parameters
  const sessionId = searchParams?.get('sessionId');
  const conversationId = searchParams?.get('conversationId');
  const messageId = searchParams?.get('messageId');
  
  // Detect if we're on a page that's not the messages page
  const isNotOnMessagesPage = pathname !== '/dashboard/messages';
  
  // Handle direct navigation to sessions and messages
  useEffect(() => {
    // Only proceed if we're not already on the messages page
    if (isNotOnMessagesPage) {
      // If sessionId is provided, redirect to the messages page with the session param
      if (sessionId) {
        // If we have the session data, we can include the conversation ID
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
          router.push(`/dashboard/messages?sessionId=${sessionId}&conversationId=${session.conversation_id}`);
        } else {
          // If we don't have the session data yet, just pass the sessionId
          router.push(`/dashboard/messages?sessionId=${sessionId}`);
        }
      } 
      // If conversationId is provided, redirect to the messages page with just that ID
      else if (conversationId) {
        let url = `/dashboard/messages?conversationId=${conversationId}`;
        // Include messageId if present
        if (messageId) {
          url += `&messageId=${messageId}`;
        }
        router.push(url);
      }
    }
  }, [isNotOnMessagesPage, sessionId, conversationId, messageId, sessions, router]);
  
  // This component doesn't render anything visible
  return null;
} 