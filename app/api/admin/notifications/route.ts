import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { isAdmin } from '@/lib/adminAuth';
import { createBroadcast } from '@/lib/adminAnalytics';

export async function POST(request: Request) {
    try {
        // Check if user is admin
        const authorized = await isAdmin();

        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const supabase = createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        if (!userId) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { title, message, type, targetUsers, userIds, expiresAt } = body;

        // Validate required fields
        if (!title || !message) {
            return NextResponse.json(
                { error: 'Title and message are required' },
                { status: 400 }
            );
        }

        const notification = await createBroadcast({
            title,
            message,
            type: type || 'info',
            targetUsers: targetUsers || 'all',
            userIds: userIds || undefined,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            createdBy: userId,
        });

        if (!notification) {
            return NextResponse.json(
                { error: 'Failed to create notification' },
                { status: 500 }
            );
        }

        return NextResponse.json(notification);
    } catch (error) {
        console.error('Error in create notification API:', error);
        return NextResponse.json(
            { error: 'Failed to create notification' },
            { status: 500 }
        );
    }
}

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

        const supabase = createServerSupabaseClient();
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching notifications:', error);
            return NextResponse.json(
                { error: 'Failed to fetch notifications' },
                { status: 500 }
            );
        }

        return NextResponse.json({ notifications: data });
    } catch (error) {
        console.error('Error in notifications API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}
