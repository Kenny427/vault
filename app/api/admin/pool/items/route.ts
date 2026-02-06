import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { getCustomPoolItems, addPoolItem, updatePoolItem, deletePoolItem } from '@/lib/poolManagement';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const authorized = await isAdmin(request);
        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const items = await getCustomPoolItems();
        return NextResponse.json({ items });
    } catch (error) {
        console.error('Error in pool items API:', error);
        return NextResponse.json({ error: 'Failed to fetch pool items' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const authorized = await isAdmin(request);
        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const { item_id, item_name, category, priority, tags, notes } = body;

        if (!item_id || !item_name) {
            return NextResponse.json({ error: 'item_id and item_name are required' }, { status: 400 });
        }

        const item = await addPoolItem({
            item_id,
            item_name,
            category,
            priority,
            tags,
            notes,
            added_by: session.user.id,
        });

        if (!item) {
            return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error('Error in add pool item API:', error);
        return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const authorized = await isAdmin(request);
        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const item = await updatePoolItem(id, updates);

        if (!item) {
            return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error('Error in update pool item API:', error);
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const authorized = await isAdmin(request);
        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const success = await deletePoolItem(id);

        if (!success) {
            return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in delete pool item API:', error);
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }
}
