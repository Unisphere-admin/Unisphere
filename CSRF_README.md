# CSRF Protection

This application uses Cross-Site Request Forgery (CSRF) protection to secure API endpoints.

## Implementation

The CSRF protection is implemented using the `next-csrf` library with some custom enhancements:

1. **Token Generation**: Secure tokens are generated using Node.js crypto library
2. **Token Validation**: All non-safe HTTP methods (POST, PUT, PATCH, DELETE) are protected
3. **Cookie & Header-based**: Tokens are stored in both cookies and headers for flexibility

## Configuration

To configure CSRF protection, add the following to your `.env` file:

```
CSRF_SECRET=your_secure_random_string_of_at_least_32_characters
```

You can generate a secure random string using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Usage

### Server-side

To protect an API route:

```typescript
import { withCsrfProtection } from "@/lib/csrf-next";

// For POST/PUT/PATCH/DELETE endpoints
export const POST = withRouteAuth(withCsrfProtection(myPostHandler));
```

### Client-side

To include CSRF tokens in requests:

```typescript
import { useCsrfToken } from "@/lib/csrf/client";

// In your component
const { token, fetchCsrfToken } = useCsrfToken();

// Before making a request
await fetchCsrfToken();

// In your fetch call
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  },
  body: JSON.stringify(data)
});
```

## Security Notes

- CSRF tokens expire after 2 hours
- Tokens are invalidated on logout
- Safe methods (GET, HEAD, OPTIONS) are not protected
- Authentication-related endpoints have special handling 