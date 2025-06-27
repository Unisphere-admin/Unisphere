import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannelOptions } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Creates a Supabase client for client-side usage
 */
export function createClient() {
  const client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'supabase-auth'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    }
  );
  
  // Wrap the channel method to ensure token is refreshed before subscribing
  const originalChannel = client.channel.bind(client);
  
  client.channel = function(name: string, opts: RealtimeChannelOptions = { config: {} }) {
    // First check if the session needs refresh
    const refreshIfNeeded = async () => {
      try {
        const { data: { session } } = await client.auth.getSession();
        
        if (session) {
          // Get expiry time from JWT
          const payload = JSON.parse(atob(session.access_token.split('.')[1]));
          const expiresAt = payload.exp * 1000; // Convert to milliseconds
          const now = Date.now();
          
          // If token expires in less than 5 minutes, refresh it
          if (expiresAt - now < 5 * 60 * 1000) {
            await client.auth.refreshSession();
          }
        }
      } catch (error) {
        console.warn("Failed to refresh token:", error);
      }
    };
    
    // Refresh token if needed before creating channel
    refreshIfNeeded().catch(console.error);
    
    // Call the original channel method
    return originalChannel(name, opts);
  };
  
  return client;
}

/**
 * Creates an anonymous Supabase client
 */
export const createAnonymousClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}; 

/**
 * Creates a generic Supabase client with custom URL and key
 */
export function createGenericClient(supabaseUrl: string, supabaseKey: string) {
  return createSupabaseClient(supabaseUrl, supabaseKey);
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

// Legacy createSupabaseClient for backward compatibility
export function createLegacyClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'supabase-auth'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
} 