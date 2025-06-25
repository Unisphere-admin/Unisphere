import { useEffect } from 'react';

/**
 * Hook to show a confirmation dialog when the user tries to leave the page
 * @param enabled Whether the confirmation is enabled
 * @param message The message to show in the confirmation dialog
 */
export function useBeforeUnload(enabled: boolean, message: string = 'Changes you made may not be saved.') {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!enabled) return;
      
      // Modern browsers no longer respect custom messages in beforeunload dialogs,
      // but we still set it for backward compatibility
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    if (enabled) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, message]);
} 