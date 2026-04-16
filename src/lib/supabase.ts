// Use the shared browser client singleton so this module does not create
// an additional GoTrueClient instance.
import { createClient } from '@/utils/supabase/client';
export const supabase = createClient();