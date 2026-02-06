import { supabase } from '@/lib/supabase';

const ADMIN_EMAIL = 'kenstorholt@gmail.com';

/**
 * Check if the current user is an admin
 * Returns true if user email matches the admin email
 */
export async function isAdmin(): Promise<boolean> {
    try {
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
export async function getCurrentUserEmail(): Promise<string | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.user?.email || null;
    } catch (error) {
        console.error('Error getting user email:', error);
        return null;
    }
}
