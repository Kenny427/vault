import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = Number(id);

  if (!Number.isFinite(itemId) || itemId <= 0) {
    return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Get latest price from price_history
  const { data: priceData, error: priceError } = await supabase
    .from('price_history')
    .select('last_price, buy_at, sell_at, margin, spread_pct, volume_5m, volume_1h')
    .eq('item_id', itemId)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (priceError && priceError.code !== 'PGRST116') {
    return NextResponse.json({ error: priceError.message }, { status: 500 });
  }

  if (!priceData) {
    return NextResponse.json({ error: 'Price not found' }, { status: 404 });
  }

  return NextResponse.json(priceData);
}
