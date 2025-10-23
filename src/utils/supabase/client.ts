import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Creates a Supabase client for client-side usage
 */
export const createClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

/**
 * Creates an anonymous Supabase client
 */
export const createAnonymousClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
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