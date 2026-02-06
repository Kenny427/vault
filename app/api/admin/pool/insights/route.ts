import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { getItemPerformance, getPoolRecommendations } from '@/lib/poolManagement';

export async function GET(req: Request) {
    try {
        const authorized = await isAdmin(req);
        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const [performance, recommendations] = await Promise.all([
            getItemPerformance(),
            getPoolRecommendations(),
        ]);

        return NextResponse.json({
            performance,
            recommendations,
        });
    } catch (error) {
        console.error('Error in pool insights API:', error);
        return NextResponse.json({ error: 'Failed to fetch pool insights' }, { status: 500 });
    }
}
