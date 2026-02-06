import { NextResponse } from 'next/server';
import { getAllUsers, getAggregatedStats } from '@/lib/supabaseAdminServices';
import { isAdmin } from '@/lib/adminAuth';

export async function GET() {
    try {
        // Check if user is admin
        const authorized = await isAdmin();

        if (!authorized) {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access required.' },
                { status: 403 }
            );
        }

        const [users, stats] = await Promise.all([
            getAllUsers(),
            getAggregatedStats(),
        ]);

        return NextResponse.json({
            users,
            stats,
        });
    } catch (error) {
        console.error('Error in admin users API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}
