import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type Opportunity = {
  item_id: number;
  item_name: string;
  last_price: number;
  margin: number;
  spread_pct: number;
  buy_at: number;
  sell_at: number;
  buy_limit: number | null;
  suggested_qty: number;
  est_profit: number;
  score: number;
  volume_5m: number | null;
  volume_1h: number | null;
};

const PER_FLIP_CAP_GP = 50_000_000; // keep aligned with /api/nba
const MIN_SPREAD_PCT = 2.0;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [thesesRes, snapshotsRes] = await Promise.all([
    supabase.from('theses').select('item_id,item_name').eq('user_id', userId).eq('active', true),
    supabase
      .from('market_snapshots')
      .select('item_id,last_price,margin,snapshot_at,volume_5m,volume_1h')
      .eq('user_id', userId),
  ]);

  if (thesesRes.error || snapshotsRes.error) {
    return NextResponse.json(
      { error: thesesRes.error?.message ?? snapshotsRes.error?.message ?? 'Failed to load market data' },
      { status: 500 },
    );
  }

  const watchedIds = Array.from(new Set<number>((thesesRes.data ?? []).map((row) => Number(row.item_id))));
  if (watchedIds.length === 0) {
    return NextResponse.json({ opportunities: [] satisfies Opportunity[] });
  }

  const itemsRes = await supabase.from('items').select('item_id,buy_limit').in('item_id', watchedIds);
  if (itemsRes.error) {
    return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
  }

  const buyLimitById = new Map<number, number>();
  for (const row of itemsRes.data ?? []) {
    const limit = Number(row.buy_limit ?? 0);
    if (limit > 0) buyLimitById.set(Number(row.item_id), limit);
  }

  const snapshotById = new Map<number, { last_price: number | null; margin: number | null; volume_5m: number | null; volume_1h: number | null }>();
  for (const row of snapshotsRes.data ?? []) {
    snapshotById.set(Number(row.item_id), {
      last_price: row.last_price,
      margin: row.margin,
      volume_5m: row.volume_5m,
      volume_1h: row.volume_1h,
    });
  }

  const opportunities: Opportunity[] = [];

  for (const thesis of thesesRes.data ?? []) {
    const itemId = Number(thesis.item_id);
    const snapshot = snapshotById.get(itemId);
    const lastPrice = Number(snapshot?.last_price ?? 0);
    const margin = Number(snapshot?.margin ?? 0);
    const volume5m = snapshot?.volume_5m ?? null;
    const volume1h = snapshot?.volume_1h ?? null;

    if (!lastPrice || !margin || margin <= 0) continue;

    const spreadPct = (margin / Math.max(lastPrice, 1)) * 100;
    if (spreadPct < MIN_SPREAD_PCT) continue;

    const buyAt = Math.max(1, Math.round(lastPrice - margin));
    const sellAt = Math.max(1, Math.round(lastPrice));

    const qtyByCap = Math.max(1, Math.floor(PER_FLIP_CAP_GP / Math.max(buyAt, 1)));
    const buyLimit = buyLimitById.get(itemId) ?? null;
    const suggestedQty = buyLimit ? clamp(qtyByCap, 1, buyLimit) : qtyByCap;

    const estProfit = Math.max(0, Math.round((sellAt - buyAt) * suggestedQty));

    // Keep score intuitive (0-100) and aligned-ish with /api/nba heuristics.
    const score = clamp(Math.round(spreadPct * 10), 1, 100);

    opportunities.push({
      item_id: itemId,
      item_name: thesis.item_name ?? `Item ${itemId}`,
      last_price: lastPrice,
      margin,
      spread_pct: Number(spreadPct.toFixed(2)),
      buy_at: buyAt,
      sell_at: sellAt,
      buy_limit: buyLimit,
      suggested_qty: suggestedQty,
      est_profit: estProfit,
      score,
      volume_5m: volume5m,
      volume_1h: volume1h,
    });
  }

  opportunities.sort((a, b) => b.score - a.score);

  return NextResponse.json({ opportunities: opportunities.slice(0, 15) });
}
