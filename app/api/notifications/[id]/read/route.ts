import { NextResponse } from 'next/server';
import { markNotificationRead } from '@/lib/adminAnalytics';
import { supabase } from '@/lib/supabase';

export async function POST(
    _request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const success = await markNotificationRead(params.id, session.user.id);

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
