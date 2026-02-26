import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { getPopularItems } from '@/lib/adminAnalytics';

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

        const popularItems = await getPopularItems();

        if (!popularItems) {
            return NextResponse.json(
                { error: 'Failed to fetch popular items' },
                { status: 500 }
            );
        }

        return NextResponse.json(popularItems);
    } catch (error) {
        console.error('Error in popular items API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch popular items' },
            { status: 500 }
        );
    }
}
