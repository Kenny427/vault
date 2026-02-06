import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { isAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

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
            host: request.headers.get('host'),
            origin: request.headers.get('origin'),
            nodeEnv: process.env.NODE_ENV,
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
            deploy_checker: "v3-middleware-test",
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
