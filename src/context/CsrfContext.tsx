"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  useCsrfToken as useClientCsrfToken,
  getCsrfTokenFromStorage,
  clearStoredCsrfToken 
} from "@/lib/csrf/client";

/**
 * CSRF token context type definition
 */
interface CsrfContextType {
  token: string | null;
  isLoading: boolean;
  error: Error | null;
  getToken: () => Promise<string | null>;
  refreshToken: () => Promise<string | null>;
  clearToken: () => void;
}

// Create the context with default values
const CsrfContext = createContext<CsrfContextType>({
  token: null,
  isLoading: false,
  error: null,
  getToken: async () => null,
  refreshToken: async () => null,
  clearToken: () => {}
});

/**
 * Hook to consume the CSRF context
 */
export function useCsrf() {
  return useContext(CsrfContext);
}

interface CsrfProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that makes CSRF token available to all children
 */
export function CsrfProvider({ children }: CsrfProviderProps) {
  // Use the client-side hook for CSRF token management
  const {
    token,
    isLoading,
    error,
    getToken,
    refreshToken
  } = useClientCsrfToken();
  
  // Add clear token function
  const clearToken = useCallback(() => {
    clearStoredCsrfToken();
  }, []);
  
  // Create context value
  const contextValue: CsrfContextType = {
    token,
    isLoading,
    error,
    getToken,
    refreshToken,
    clearToken
  };
  
  return (
    <CsrfContext.Provider value={contextValue}>
      {children}
    </CsrfContext.Provider>
  );
} 