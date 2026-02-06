import { createServerSupabaseClient } from '@/lib/supabaseServer';

const ADMIN_EMAIL = 'kenstorholt@gmail.com';

/**
 * Check if the current user is an admin
 * Returns true if user email matches the admin email
 */
export async function isAdmin(request: Request): Promise<boolean> {
    try {
        // TEMPORARY: Allow all users in local development
        // TODO: Fix cookie-based auth for production
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔓 Admin check bypassed for local development');
            return true;
        }

        const supabase = createServerSupabaseClient(request);
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.email) {
            return false;
        }

        return session.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

/**
 * Get current user email
 */
export async function getCurrentUserEmail(request: Request): Promise<string | null> {
    try {
        const supabase = createServerSupabaseClient(request);
        const { data: { session } } = await supabase.auth.getSession();
        return session?.user?.email || null;
    } catch (error) {
        console.error('Error getting user email:', error);
        return null;
    }
}
