import { NextResponse } from 'next/server';
import { getUserDetailedStats } from '@/lib/supabaseAdminServices';
import { isAdmin } from '@/lib/adminAuth';

export async function GET(
    _request: Request,
    { params }: { params: { userId: string } }
) {
    try {
        // Check if user is admin
        const authorized = await isAdmin();

        if (!authorized) {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access required.' },
                { status: 403 }
            );
        }

        const userStats = await getUserDetailedStats(params.userId);

        if (!userStats) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(userStats);
    } catch (error) {
        console.error('Error in admin user details API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user details' },
            { status: 500 }
        );
    }
}
