import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/game-updates
 * Get all game updates with their item impacts
 */
export async function GET(request: Request) {
  try {
    const authorized = await isAdmin();
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreviewed = searchParams.get('unreviewed') === 'true';

    const supabase = createServerSupabaseClient();

    // Build query
    let query = supabase
      .from('game_updates')
      .select(`
        *,
        impacts:update_item_impacts(*)
      `)
      .eq('is_active', true)
      .order('update_date', { ascending: false })
      .limit(limit);

    if (unreviewed) {
      query = query.eq('is_reviewed', false);
    }

    const { data: updates, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      updates: updates || [],
      count: updates?.length || 0,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching updates:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch updates', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/game-updates
 * Update a game update (review, sentiment, etc.)
 */
export async function PATCH(request: Request) {
  try {
    const authorized = await isAdmin();
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Update ID required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('game_updates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'Update successful',
      update: data,
    });

  } catch (error) {
    console.error('Error updating game update:', error);
    return NextResponse.json({ 
      error: 'Failed to update', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
