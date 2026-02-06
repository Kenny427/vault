import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { getAnalyticsOverview } from '@/lib/adminAnalytics';

export async function GET(request: Request) {
    try {
        // Check if user is admin
        const authorized = await isAdmin(request);

        if (!authorized) {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access required.' },
                { status: 403 }
            );
        }

        // Get days parameter from query string
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30');

        const overview = await getAnalyticsOverview(days);

        if (!overview) {
            return NextResponse.json(
                { error: 'Failed to fetch analytics' },
                { status: 500 }
            );
        }

        return NextResponse.json(overview);
    } catch (error) {
        console.error('Error in analytics overview API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics overview' },
            { status: 500 }
        );
    }
}
