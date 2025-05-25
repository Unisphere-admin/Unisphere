'use server';

// This file is now only for server component and API route imports
// Client-side components should import from @/utils/supabase/client

import { 
  createServerClientWithCookies as _createServerClientWithCookies,
  createRouteHandlerClientWithCookies as _createRouteHandlerClientWithCookies 
} from '@/utils/supabase/server';

// Re-export for backward compatibility
export const createServerClientWithCookies = _createServerClientWithCookies;
export const createRouteHandlerClientWithCookies = _createRouteHandlerClientWithCookies; 