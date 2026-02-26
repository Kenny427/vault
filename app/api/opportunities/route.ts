import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type Opportunity = {
  item_id: number;
  item_name: string;
  last_price: number;
  margin: number;
  spread_pct: number;
  volume_1h: number | null;
  buy_limit: number | null;
  suggested_qty: number;
  est_profit: number;
  score: number;
  snapshot_at: string | null;
};

const PER_FLIP_CAP_GP = 50_000_000; // keep consistent with /api/nba (Ray preference)

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeScore(params: { spreadPct: number; margin: number; lastPrice: number; volume1h: number | null }) {
  const { spreadPct, margin, lastPrice, volume1h } = params;

  // Simple, explainable MVP heuristic:
  // - Base is spread percentage
  // - Boost if margin is meaningfully large
  // - Slight boost for liquidity (volume), capped
  const marginBoost = clamp(Math.log10(Math.max(margin, 1)) * 4, 0, 18);
  const liqBoost = volume1h ? clamp(Math.log10(Math.max(volume1h, 1)) * 6, 0, 18) : 0;
  const pricePenalty = lastPrice > 20_000_000 ? 6 : lastPrice > 100_000_000 ? 10 : 0;

  return clamp(spreadPct * 10 + marginBoost + liqBoost - pricePenalty, 0, 100);
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snapshotsRes = await supabase
    .from('market_snapshots')
    .select('item_id,last_price,margin,volume_1h,snapshot_at')
    .eq('user_id', userId)
    .not('last_price', 'is', null)
    .not('margin', 'is', null);

  if (snapshotsRes.error) {
    return NextResponse.json({ error: snapshotsRes.error.message }, { status: 500 });
  }

  const snapshotRows = (snapshotsRes.data ?? []) as Array<{
    item_id: number;
    last_price: number | null;
    margin: number | null;
    volume_1h: number | null;
    snapshot_at: string | null;
  }>;

  if (snapshotRows.length === 0) {
    return NextResponse.json({ opportunities: [] satisfies Opportunity[] });
  }

  const itemIds = Array.from(new Set(snapshotRows.map((row) => Number(row.item_id))));

  const itemsRes = await supabase.from('items').select('item_id,name,buy_limit').in('item_id', itemIds);
  if (itemsRes.error) {
    return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
  }

  const itemsById = new Map<number, { name: string | null; buy_limit: number | null }>();
  for (const row of itemsRes.data ?? []) {
    itemsById.set(Number(row.item_id), {
      name: (row as { name?: string | null }).name ?? null,
      buy_limit: Number((row as { buy_limit?: number | null }).buy_limit ?? 0) || null,
    });
  }

  const opportunities: Opportunity[] = snapshotRows
    .map((row) => {
      const itemId = Number(row.item_id);
      const lastPrice = Number(row.last_price ?? 0);
      const margin = Number(row.margin ?? 0);

      if (!itemId || lastPrice <= 0 || margin <= 0) return null;

      const spreadPct = (margin / Math.max(lastPrice, 1)) * 100;
      if (spreadPct < 2.0) return null; // noise control: ignore tiny spreads

      const itemMeta = itemsById.get(itemId);
      const buyLimit = itemMeta?.buy_limit ?? null;

      const qtyByCap = Math.floor(PER_FLIP_CAP_GP / Math.max(lastPrice, 1));
      const suggestedQty = buyLimit ? Math.max(1, Math.min(buyLimit, qtyByCap)) : Math.max(1, qtyByCap);
      const estProfit = Math.max(0, Math.round(margin * suggestedQty));

      const score = computeScore({ spreadPct, margin, lastPrice, volume1h: row.volume_1h });

      return {
        item_id: itemId,
        item_name: itemMeta?.name ?? `Item ${itemId}`,
        last_price: lastPrice,
        margin,
        spread_pct: spreadPct,
        volume_1h: row.volume_1h,
        buy_limit: buyLimit,
        suggested_qty: suggestedQty,
        est_profit: estProfit,
        score,
        snapshot_at: row.snapshot_at,
      } satisfies Opportunity;
    })
    .filter(Boolean) as Opportunity[];

  opportunities.sort((a, b) => b.score - a.score);

  return NextResponse.json({ opportunities: opportunities.slice(0, 20) });
}
