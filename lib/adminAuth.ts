import { createServerSupabaseClient } from '@/lib/supabaseServer';

const ADMIN_EMAIL = 'kenstorholt@gmail.com';

/**
 * Check if the current user is an admin
 * Returns true if user email matches the admin email
 */
export async function isAdmin(): Promise<boolean> {
    try {
        // Local development bypass
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔓 Admin check bypassed for local development');
            return true;
        }

        const supabase = createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user?.email) {
            return false;
        }

        return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

/**
 * Get current user email
 */
export async function getCurrentUserEmail(): Promise<string | null> {
    try {
        const supabase = createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        return user?.email || null;
    } catch (error) {
        console.error('Error getting user email:', error);
        return null;
    }
}
