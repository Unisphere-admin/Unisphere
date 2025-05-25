# Authentication Security Improvements

## Overview

This document outlines security improvements made to our authentication flow, specifically focusing on replacing unsafe `auth.getSession()` calls with more secure `auth.getUser()` calls to mitigate potential security vulnerabilities.

## Background

Supabase documentation warns that relying on `getSession()` for authentication can be insecure due to a risk known as "Auth Object Injection." The user object returned from `supabase.auth.getSession()` comes directly from the storage medium (cookies) and may not be authentic.

## Security Issues with `getSession()`

1. **Auth Object Injection Risk**: The session data is read directly from cookies which could potentially be manipulated.
2. **Unverified User Data**: The user object isn't verified against the JWT's actual content.
3. **Client Trust Issue**: The code relies on client-side state that could be tampered with.

## Implemented Security Improvements

### 1. Use `getUser()` for Authentication

We've replaced calls to `getSession()` with `getUser()` for all authentication checks. The `getUser()` method:

- Validates the JWT signature cryptographically
- Ensures the token hasn't expired
- Verifies the JWT hasn't been tampered with

```typescript
// BEFORE - Insecure
const { data: { session }, error } = await supabase.auth.getSession();
if (error || !session) {
  // Not authenticated
}
const user = session.user;

// AFTER - Secure
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  // Not authenticated
}
```

### 2. Two-Phase Authentication for Edge Function Calls

For cases where we need both user authentication and an access token (e.g., for edge function calls):

1. First authenticate with `getUser()` to verify identity
2. Then get the token with `getSession()` for API calls
3. Refresh the session when needed to ensure valid tokens

```typescript
// Secure approach
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return unauthorized();
}

// Only after user verification, get tokens
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !session) {
  return tokenError();
}

// Use the token for API calls
const apiCall = await fetch(url, {
  headers: { Authorization: `Bearer ${session.access_token}` }
});
```

### 3. Helper Utility Functions

Added secure helper functions in `src/utils/supabase/client.ts`:

- `safeGetAuthUser()`: Securely verify the authenticated user
- `safeGetAccessToken()`: Safely get the access token after user verification

### 4. Secure Supabase Edge Functions

Updated the edge function to follow best security practices:

- Proper JWT validation with admin client
- Authenticated requests before accessing any token data 
- Requirement for valid Authorization header with Bearer token
- Clear documentation of secure patterns

## Files Updated

1. `src/lib/auth/protectedFetch.ts`
2. `src/app/api/tutoring-sessions/route.ts`
3. `src/app/api/auth/session/route.ts`
4. `src/context/AuthContext.tsx`
5. `supabase/functions/get-user-tokens/index.ts`
6. `src/utils/supabase/client.ts`

## References

- [Supabase Auth Helpers Documentation](https://supabase.com/docs/guides/auth/auth-helpers)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [OWASP Authentication Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) 