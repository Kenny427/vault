import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/game-updates/item/[id]
 * Get game updates relevant to a specific item
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = parseInt(params.id);
    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('days') || '14');

    const supabase = createServerSupabaseClient();

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Get updates related to this item
    const { data: impacts, error } = await supabase
      .from('item_update_history')
      .select('*')
      .eq('item_id', itemId)
      .gte('update_date', cutoffDate.toISOString())
      .order('update_date', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      item_id: itemId,
      updates: impacts || [],
      count: impacts?.length || 0,
      days_back: daysBack,
    });

  } catch (error) {
    console.error('Error fetching item updates:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch item updates', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
