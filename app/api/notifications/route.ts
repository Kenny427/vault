import { NextResponse } from 'next/server';
import { getUserNotifications } from '@/lib/adminAnalytics';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const notifications = await getUserNotifications(session.user.id);

        return NextResponse.json({ notifications });
    } catch (error) {
        console.error('Error in user notifications API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}
