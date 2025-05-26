"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  useCsrfToken as useClientCsrfToken,
  storeCsrfToken,
  clearStoredCsrfToken 
} from "@/lib/csrf/client";

// Re-export the client-side hook interface
export const useCsrf = useClientCsrfToken;

// This context provider is now just a wrapper around the client-side hook
// for backward compatibility with existing code
interface CsrfProviderProps {
  children: React.ReactNode;
}

export function CsrfProvider({ children }: CsrfProviderProps) {
  return <>{children}</>;
} 