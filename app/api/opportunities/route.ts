import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type ActionPriority = 'high' | 'medium' | 'low';

type OpportunityCard = {
  item_id: number;
  item_name: string;
  last_high: number | null;
  last_low: number | null;
  last_price: number | null;
  margin: number | null;
  spread_pct: number | null;
  volume_1h: number | null;
  suggested_qty: number;
  buy_at: number | null;
  sell_at: number | null;
  est_profit: number | null;
  score: number;
  priority: ActionPriority;
};

const PER_FLIP_CAP_GP = 50_000_000;

function computePriority(score: number): ActionPriority {
  if (score >= 85) return 'high';
  if (score >= 55) return 'medium';
  return 'low';
}

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

  const [thesesRes, snapshotsRes, itemsRes] = await Promise.all([
    supabase.from('theses').select('item_id,item_name,priority').eq('user_id', userId).eq('active', true),
    supabase.from('market_snapshots').select('item_id,last_price,last_high,last_low,margin,volume_1h').eq('user_id', userId),
    supabase.from('items').select('item_id,buy_limit'),
  ]);

  const firstError = thesesRes.error ?? snapshotsRes.error ?? itemsRes.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const snapshotByItem = new Map<number, any>();
  for (const row of snapshotsRes.data ?? []) {
    snapshotByItem.set(Number(row.item_id), row);
  }

  const buyLimitByItem = new Map<number, number>();
  for (const row of itemsRes.data ?? []) {
    buyLimitByItem.set(Number(row.item_id), Number(row.buy_limit ?? 0));
  }

  const cards: OpportunityCard[] = [];

  for (const thesis of thesesRes.data ?? []) {
    const itemId = Number(thesis.item_id);
    const snapshot = snapshotByItem.get(itemId);
    if (!snapshot) continue;

    const lastPrice = Number(snapshot.last_price ?? 0) || null;
    const margin = Number(snapshot.margin ?? 0) || null;
    if (!lastPrice || !margin || margin <= 0) continue;

    const spreadPct = (margin / Math.max(lastPrice, 1)) * 100;

    // Noise control: ignore tiny spreads.
    if (spreadPct < 2.0) continue;

    const buyLimit = buyLimitByItem.get(itemId) ?? 0;
    const qtyByCap = Math.floor(PER_FLIP_CAP_GP / Math.max(lastPrice, 1));
    const suggestedQty = buyLimit > 0 ? clamp(qtyByCap, 1, buyLimit) : Math.max(1, qtyByCap);

    const buyAt = Math.max(1, Math.round(lastPrice - margin));
    const sellAt = Math.max(1, Math.round(lastPrice));
    const estProfit = Math.max(0, Math.round((sellAt - buyAt) * suggestedQty));

    // Scoring: spread is king, volume is a tiebreaker.
    const volume1h = Number(snapshot.volume_1h ?? 0) || null;
    const volumeBoost = volume1h ? clamp(Math.log10(volume1h + 1) * 6, 0, 18) : 0;
    const score = clamp(Math.round(spreadPct * 10 + volumeBoost), 35, 99);

    cards.push({
      item_id: itemId,
      item_name: thesis.item_name ?? `Item ${itemId}`,
      last_high: snapshot.last_high ?? null,
      last_low: snapshot.last_low ?? null,
      last_price: snapshot.last_price ?? null,
      margin: snapshot.margin ?? null,
      spread_pct: Number.isFinite(spreadPct) ? Math.round(spreadPct * 10) / 10 : null,
      volume_1h: volume1h,
      suggested_qty: suggestedQty,
      buy_at: buyAt,
      sell_at: sellAt,
      est_profit: estProfit,
      score,
      priority: computePriority(score),
    });
  }

  cards.sort((a, b) => b.score - a.score);

  return NextResponse.json({ opportunities: cards.slice(0, 25) });
}
