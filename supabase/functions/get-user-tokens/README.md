# get-user-tokens Edge Function

This Supabase Edge Function securely retrieves a user's token balance. It's specifically designed to be used by the tutoring session API when verifying if a student has enough tokens for a session.

## Usage

The function accepts a POST request with a JSON body containing a `userId` property. It requires a valid JWT token in the `Authorization` header.

### Request Format

```json
{
  "userId": "user-uuid-here"
}
```

### Headers

```
Authorization: Bearer <valid-jwt-token>
```

### Response Format

```json
{
  "tokens": 5,
  "userId": "user-uuid-here"
}
```

### Error Responses

- 400: Invalid request (missing or invalid userId)
- 401: Unauthorized (missing or invalid JWT token)
- 404: User not found
- 405: Method not allowed (only POST is supported)
- 500: Internal server error

## Development

Deploy this function to your Supabase project with:

```bash
# Deploy with JWT verification enabled
supabase functions deploy get-user-tokens

# If you want to test it without JWT verification (not recommended for production)
# supabase functions deploy get-user-tokens --no-verify-jwt
```

> **Important**: Always deploy with JWT verification enabled for production use. The `--no-verify-jwt` flag should only be used for local development and testing.

## Authentication Notes

This function:

1. Requires a valid JWT token with authenticated role
2. Uses the `Authorization: Bearer <token>` header to verify the user
3. Manually verifies the JWT token using `supabaseAdmin.auth.getUser(token)`
4. Applies proper CORS headers to allow cross-origin requests
5. Provides detailed error messages for troubleshooting

## Environment Variables

The function requires the following environment variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (automatically available in production)
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key for client authentication (not used for database operations)

## Security Considerations

This function:
1. Verifies the caller is authenticated via JWT
2. Uses the service role key to access the users table directly
3. Only returns token information for the requested user
4. Implements proper input validation and error handling
5. Does not allow users to check their own tokens (this should be done directly in the client) 