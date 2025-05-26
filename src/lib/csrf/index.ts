'use client';

// We only export client-side safe utilities from this main entry point
export {
  CSRF_HEADER_NAME,
  CSRF_FORM_FIELD,
  useCsrfToken,
  addCsrfToken,
  storeCsrfToken,
  getCsrfTokenFromStorage,
  clearStoredCsrfToken,
  createProtectedFetchWithCsrf
} from './client';

// Server-side functions should be imported directly from './server'
// DO NOT import these in client components:
// - generateCsrfToken
// - validateStoredToken
// - clearCsrfToken (server version)
// - csrfMiddleware
// - withCsrfProtection 