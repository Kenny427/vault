import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { isAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
    try {
        const supabase = createServerSupabaseClient(request);
        const { data: { session } } = await supabase.auth.getSession();
        const adminStatus = await isAdmin(request);

        return NextResponse.json({
            isLoggedIn: !!session,
            userEmail: session?.user?.email || null,
            isAdmin: adminStatus,
            expectedAdminEmail: 'kenstorholt@gmail.com',
            message: adminStatus
                ? '✅ You are an admin!'
                : session
                    ? `❌ Not admin. Your email: ${session.user?.email}, Expected: kenstorholt@gmail.com`
                    : '❌ Not logged in'
        });
    } catch (error) {
        console.error('Auth debug error:', error);
        return NextResponse.json({ error: 'Failed to check auth status', details: String(error) }, { status: 500 });
    }
}
