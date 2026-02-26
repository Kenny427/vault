import { NextResponse } from 'next/server';
import { getUserNotifications } from '@/lib/adminAnalytics';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET() {
    try {
        const supabase = createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const notifications = await getUserNotifications(user.id);

        return NextResponse.json({ notifications });
    } catch (error) {
        console.error('Error in user notifications API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}
