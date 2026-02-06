import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { isAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
    try {
        const supabase = createServerSupabaseClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        const adminStatus = await isAdmin();
        const cookieHeader = request.headers.get('cookie') || 'No cookies found';

        // Extract cookie names for diagnosis
        const cookieNames = cookieHeader !== 'No cookies found'
            ? cookieHeader.split(';').map(c => c.split('=')[0].trim())
            : [];

        return NextResponse.json({
            isLoggedIn: !!user,
            userEmail: user?.email || null,
            isAdmin: adminStatus,
            expectedAdminEmail: 'kenstorholt@gmail.com',
            userError: userError ? userError.message : null,
            cookieNames,
            message: adminStatus
                ? '✅ You are an admin!'
                : user
                    ? `❌ Not admin. Your email: ${user.email}, Expected: kenstorholt@gmail.com`
                    : '❌ Not logged in'
        });
    } catch (error) {
        console.error('Auth debug error:', error);
        return NextResponse.json({ error: 'Failed to check auth status', details: String(error) }, { status: 500 });
    }
}
