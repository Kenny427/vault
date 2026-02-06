import { createClient } from '@supabase/supabase-js';

/**
 * Create admin Supabase client with service role key
 * This bypasses RLS for admin operations
 */
export function createAdminSupabaseClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}
