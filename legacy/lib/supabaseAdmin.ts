import { createClient } from '@supabase/supabase-js';

/**
 * Create admin Supabase client with service role key
 * This bypasses RLS for admin operations
 */
export function createAdminSupabaseClient() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey && process.env.NODE_ENV === 'production') {
        console.error('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in production! Falling back to ANON key (this will cause RLS errors).');
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}
