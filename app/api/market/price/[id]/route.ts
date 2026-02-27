import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLatest } from '@/lib/market/osrsWiki';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = Number(id);

  if (!Number.isFinite(itemId) || itemId <= 0) {
    return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get latest price data from OSRS Wiki
  const latestData = await getLatest();
  const itemData = latestData[String(itemId)];

  if (!itemData) {
    return NextResponse.json({ error: 'Item not found in price data' }, { status: 404 });
  }

  const high = itemData.high ?? 0;
  const low = itemData.low ?? 0;
  const lastPrice = high || low || 0;
  const buyAt = high || 0;
  const sellAt = low || 0;
  const margin = high && low ? high - low : 0;
  const spreadPct = high && low && high > 0 ? ((high - low) / high) * 100 : 0;

  // Get volume data from market_snapshots
  const { data: snapshotData } = await supabase
    .from('market_snapshots')
    .select('volume_5m, volume_1h')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .single();

  const volume5m = snapshotData?.volume_5m ?? null;
  const volume1h = snapshotData?.volume_1h ?? null;

  return NextResponse.json({
    last_price: lastPrice,
    buy_at: buyAt,
    sell_at: sellAt,
    margin,
    spread_pct: spreadPct,
    volume_5m: volume5m,
    volume_1h: volume1h,
  });
}
