import { useState, useEffect } from 'react';

/**
 * Hook to track document visibility state
 * @returns Object containing isVisible and isFocused states
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isFocused, setIsFocused] = useState<boolean>(true);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isOnMessagesPage, setIsOnMessagesPage] = useState<boolean>(false);
  
  // Update visibility state when document visibility changes
  useEffect(() => {
    // Initial state
    setIsVisible(!document.hidden);
    setIsFocused(document.hasFocus());
    
    // Set current path
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      setCurrentPath(path);
      setIsOnMessagesPage(path === '/dashboard/messages');
    }
    
    // Create event listeners
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    
    const handleFocus = () => {
      setIsFocused(true);
    };
    
    const handleBlur = () => {
      setIsFocused(false);
    };
    
    const handleRouteChange = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      setIsOnMessagesPage(path === '/dashboard/messages');
    };
    
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // Listen for route changes in browser
    window.addEventListener('popstate', handleRouteChange);
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);
  
  return {
    isVisible,
    isFocused,
    currentPath,
    isOnMessagesPage
  };
} 