import { NextResponse } from 'next/server';
import { markNotificationRead } from '@/lib/adminAnalytics';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const success = await markNotificationRead(params.id, user.id);

        if (!success) {
            return NextResponse.json(
                { error: 'Failed to mark notification as read' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in mark notification read API:', error);
        return NextResponse.json(
            { error: 'Failed to mark notification as read' },
            { status: 500 }
        );
    }
}
