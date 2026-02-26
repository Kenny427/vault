import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { getAllRateLimits, updateRateLimit } from '@/lib/poolManagement';

export async function GET() {
    try {
        const authorized = await isAdmin();
        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const limits = await getAllRateLimits();
        return NextResponse.json({ limits });
    } catch (error) {
        console.error('Error in rate limits API:', error);
        return NextResponse.json({ error: 'Failed to fetch rate limits' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const authorized = await isAdmin();
        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { userId, dailyLimit } = body;

        if (!userId || dailyLimit === undefined) {
            return NextResponse.json({ error: 'userId and dailyLimit are required' }, { status: 400 });
        }

        const limit = await updateRateLimit(userId, dailyLimit);

        if (!limit) {
            return NextResponse.json({ error: 'Failed to update rate limit' }, { status: 500 });
        }

        return NextResponse.json(limit);
    } catch (error) {
        console.error('Error in update rate limit API:', error);
        return NextResponse.json({ error: 'Failed to update rate limit' }, { status: 500 });
    }
}
