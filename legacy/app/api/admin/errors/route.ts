import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { getRecentErrors } from '@/lib/adminAnalytics';

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

        // Get limit parameter from query string
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        const errors = await getRecentErrors(limit);

        return NextResponse.json({ errors });
    } catch (error) {
        console.error('Error in errors API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch errors' },
            { status: 500 }
        );
    }
}
