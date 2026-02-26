import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { getCostBreakdown } from '@/lib/adminAnalytics';

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

        // Get parameters from query string
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30');
        const eventType = searchParams.get('eventType') || null;

        const breakdown = await getCostBreakdown(days, eventType);

        return NextResponse.json(breakdown);
    } catch (error) {
        console.error('Error in cost breakdown API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch cost breakdown' },
            { status: 500 }
        );
    }
}
