import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Singleton browser client - one GoTrueClient per browser context.
// Creating multiple instances sharing the same storage key causes competing
// auth refresh loops and "Multiple GoTrueClient instances" warnings.
let _browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Returns the shared Supabase browser client (singleton).
 * Safe to call from any client component or utility - always returns the same instance.
 */
export const createClient = () => {
  if (!_browserClient) {
    _browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return _browserClient;
};

/**
 * Creates an anonymous Supabase client (uses the shared singleton).
 */
export const createAnonymousClient = () => {
  return createClient();
};

/**
 * Creates a generic Supabase client with custom URL and key
 * Typically used for service-role operations on the server
 */
export function createGenericClient(supabaseUrl: string, supabaseKey: string) {
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

/**
 * Safely get the authenticated user
 * This is the recommended approach over getSession() which can be unsafe
 * 
 * @param supabase A Supabase client instance
 * @returns The authenticated user or null
 */
export async function safeGetAuthUser(supabase: SupabaseClient) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Safely get the access token from a session
 * Only call this AFTER verifying the user is authenticated with safeGetAuthUser
 * 
 * @param supabase A Supabase client instance
 * @returns The access token or null
 */
export async function safeGetAccessToken(supabase: SupabaseClient): Promise<string | null> {
  try {
    // Get the user first for security
    const user = await safeGetAuthUser(supabase);
    
    if (!user) {
      return null;
    }
    
    // Now it's safe to get the session for the token
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return null;
    }
    
    return session.access_token;
  } catch (error) {
    return null;
  }
} 