import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { getDatabaseHealth } from '@/lib/poolManagement';

export async function GET(request: Request) {
    try {
        const authorized = await isAdmin(request);
        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const health = await getDatabaseHealth();

        if (!health) {
            return NextResponse.json({ error: 'Failed to fetch database health' }, { status: 500 });
        }

        return NextResponse.json(health);
    } catch (error) {
        console.error('Error in database health API:', error);
        return NextResponse.json({ error: 'Failed to fetch database health' }, { status: 500 });
    }
}
