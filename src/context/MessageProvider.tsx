"use client";

import { createContext, useContext } from 'react';
import { MessageProvider as OriginalMessageProvider } from '@/context/MessageContext';
import { usePageVisibility } from '@/hooks/usePageVisibility';

// Create a default safe message context with dummy values
const defaultContextValues = {
  conversations: [],
  messages: {},
  loading: false,
  loadingMessages: false,
  selectedConversationId: null,
  setSelectedConversationId: () => {},
  currentConversation: null,
  sendMessage: async () => ({ message: null, error: "Not initialized" }),
  hasUnreadMessages: () => false,
  markConversationAsRead: async () => false,
  setUserTyping: () => {},
  isUserTyping: () => false,
  typingStates: {},
  refreshMessages: async () => {},
  pageVisibility: {
    isVisible: true,
    isFocused: true,
    currentPath: '',
    isOnMessagesPage: false
  }
};

// Create a default safe message context
const SafeMessageContext = createContext<any>(defaultContextValues);

/**
 * Safe message provider that ensures context is always available
 * even before real data is loaded
 */
export function SafeMessageProvider({ children }: { children: React.ReactNode }) {
  const pageVisibility = usePageVisibility();
  
  return (
    <SafeMessageContext.Provider value={defaultContextValues}>
      <OriginalMessageProvider pageVisibility={pageVisibility}>
        {children}
      </OriginalMessageProvider>
    </SafeMessageContext.Provider>
  );
}

/**
 * Hook to safely access message context
 */
export function useSafeMessages() {
  return useContext(SafeMessageContext);
} 