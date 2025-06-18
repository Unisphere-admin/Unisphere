/**
 * CSRF Protection Module
 * 
 * This module exports all necessary functions and constants for CSRF protection
 * throughout the application.
 */

// Re-export server-side functions
export {
  generateCsrfToken,
  refreshCsrfToken,
  validateStoredToken,
  clearCsrfToken,
  csrfMiddleware,
  withCsrfProtection,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_FORM_FIELD
} from './server';

// Re-export client-side functions
export {
  useCsrfToken,
  getCsrfTokenFromStorage,
  storeCsrfToken,
  clearStoredCsrfToken,
  addCsrfToken,
  isTokenExpired,
  createProtectedFetchWithCsrf
} from './client';

// Re-export context provider
export { CsrfProvider, useCsrf } from '@/context/CsrfContext'; 