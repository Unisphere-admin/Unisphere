/**
 * @deprecated This file is maintained for backwards compatibility.
 * Please import from '@/lib/csrf/server', '@/lib/csrf/client', or '@/lib/csrf/index' instead.
 */

import { NextRequest, NextResponse } from "next/server";
import { AuthUser } from "@/lib/auth/protectResource";

// Re-export from the server implementation
import { 
  generateCsrfToken as generateToken,
  validateStoredToken as validateToken,
  clearCsrfToken as clearToken,
  csrfMiddleware as csrfCheck,
  withCsrfProtection as withCsrfCheck,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_FORM_FIELD
} from "./csrf/server";

// Re-export from client implementation
import {
  useCsrfToken as useToken,
  addCsrfToken as addToken
} from "./csrf/client";

// Re-export with original names for backward compatibility
export const generateCsrfToken = generateToken;
export const validateStoredToken = validateToken;
export const clearCsrfToken = clearToken;
export const csrfMiddleware = csrfCheck;
export const withCsrfProtection = withCsrfCheck;
export const useCsrfToken = useToken;
export const addCsrfToken = addToken;

// Re-export types
export interface TokenData {
  token: string;
  expires: number;
  userId?: string; // Added for compatibility with new implementation
  createdAt?: number; // Added for compatibility with new implementation
}

// Helper function for backward compatibility
export function getCsrfFormField(): string {
  return CSRF_FORM_FIELD;
} 