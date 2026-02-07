import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { getAnalyticsOverview } from '@/lib/adminAnalytics';

export async function GET(request: Request) {
    try {
        // Check if user is admin
        const authorized = await isAdmin();

        if (!authorized) {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access required.' },
                { status: 403 }
            );
        }

        // Get filter parameters from query string
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30');
        const eventType = searchParams.get('eventType') || null;
        const minCost = parseFloat(searchParams.get('minCost') || '0');
        const maxCost = parseFloat(searchParams.get('maxCost') || 'Infinity');
        const granularity = searchParams.get('granularity') || 'day'; // day, hour, week

        const overview = await getAnalyticsOverview(days, {
            eventType,
            minCost: minCost > 0 ? minCost : null,
            maxCost: isFinite(maxCost) ? maxCost : null,
            granularity,
        });

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
