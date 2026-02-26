import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendDiscordAlert } from '@/lib/server/discord';

type ActionPriority = 'high' | 'medium' | 'low';

type NextBestAction = {
  type: string;
  item_id?: number;
  item_name: string;
  reason: string;
  priority: ActionPriority;
  score: number;
  // Optional structured fields for rendering opportunity cards.
  suggested_buy?: number;
  suggested_sell?: number;
  spread_pct?: number;
  suggested_qty?: number;
  est_profit?: number;
};

const PER_FLIP_CAP_GP = 50_000_000; // Ray choice: option 4 (30M+). Keep conservative but useful.

function computePriority(score: number): ActionPriority {
  if (score >= 85) return 'high';
  if (score >= 55) return 'medium';
  return 'low';
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [snapshotsRes, positionsRes, thesesRes, alertsRes, staleOrdersRes] = await Promise.all([
    supabase
      .from('market_snapshots')
      .select('item_id,last_price,last_high,last_low,margin,volume_1h,volume_5m,snapshot_at')
      .eq('user_id', userId),
    supabase
      .from('positions')
      .select('id,item_id,item_name,quantity,avg_buy_price,last_price,unrealized_profit,realized_profit')
      .eq('user_id', userId)
      .neq('quantity', 0),
    supabase.from('theses').select('id,item_id,item_name,target_buy,target_sell,priority,active').eq('user_id', userId).eq('active', true),
    supabase.from('alerts').select('id,item_id,severity,title,resolved_at').eq('user_id', userId).is('resolved_at', null),
    supabase.from('order_attempts').select('id,item_id,item_name,created_at,status,side').eq('user_id', userId).eq('status', 'open').lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()),
  ]);

  const firstError = snapshotsRes.error ?? positionsRes.error ?? thesesRes.error ?? alertsRes.error ?? staleOrdersRes.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const snapshotByItem = new Map<
    number,
    {
      last_price: number | null;
      last_high: number | null;
      last_low: number | null;
      margin: number | null;
      volume_1h: number | null;
      volume_5m: number | null;
      snapshot_at: string | null;
    }
  >();

  for (const snapshot of snapshotsRes.data ?? []) {
    snapshotByItem.set(Number(snapshot.item_id), {
      last_price: snapshot.last_price,
      last_high: snapshot.last_high,
      last_low: snapshot.last_low,
      margin: snapshot.margin,
      volume_1h: (snapshot as any).volume_1h ?? null,
      volume_5m: (snapshot as any).volume_5m ?? null,
      snapshot_at: snapshot.snapshot_at,
    });
  }

  const actions: NextBestAction[] = [];
  const criticalMessages: string[] = [];

  const watchItemIds = Array.from(new Set<number>((thesesRes.data ?? []).map((t) => Number(t.item_id))));
  const buyLimitByItem = new Map<number, number>();
  if (watchItemIds.length > 0) {
    const itemsRes = await supabase.from('items').select('item_id,buy_limit').in('item_id', watchItemIds);
    if (!itemsRes.error) {
      for (const row of itemsRes.data ?? []) {
        buyLimitByItem.set(Number(row.item_id), Number(row.buy_limit ?? 0));
      }
    }
  }

  for (const staleOrder of staleOrdersRes.data ?? []) {
    const score = 92;
    actions.push({
      type: 'adjust_stale_order',
      item_id: Number(staleOrder.item_id),
      item_name: staleOrder.item_name ?? `Item ${staleOrder.item_id}`,
      reason: `Order has been open since ${new Date(staleOrder.created_at).toLocaleTimeString()}. Reprice or cancel.`,
      priority: computePriority(score),
      score,
    });
    criticalMessages.push(`Stale order: ${staleOrder.item_name ?? staleOrder.item_id}`);
  }

  for (const position of positionsRes.data ?? []) {
    const itemId = Number(position.item_id);
    const snapshot = snapshotByItem.get(itemId);
    const matchingThesis = (thesesRes.data ?? []).find((thesis) => Number(thesis.item_id) === itemId);
    const lastPrice = snapshot?.last_price ?? position.last_price ?? null;

    if (matchingThesis?.target_sell && lastPrice && lastPrice >= matchingThesis.target_sell) {
      const score = 90;
      actions.push({
        type: 'take_profit',
        item_id: itemId,
        item_name: position.item_name,
        reason: `Target sell hit (${Math.round(lastPrice).toLocaleString()} >= ${matchingThesis.target_sell.toLocaleString()}).`,
        priority: computePriority(score),
        score,
      });
      criticalMessages.push(`Exit target hit: ${position.item_name}`);
      continue;
    }

    if (position.quantity > 0 && snapshot?.margin && snapshot.margin > 0) {
      const score = Math.min(82, Math.max(52, Math.floor(snapshot.margin / Math.max((lastPrice ?? 1) * 0.005, 1)) + 50));
      actions.push({
        type: 'manage_position',
        item_id: itemId,
        item_name: position.item_name,
        reason: `Open position with est. margin ${Math.round(snapshot.margin).toLocaleString()} gp.`,
        priority: computePriority(score),
        score,
      });
    }
  }

  for (const thesis of thesesRes.data ?? []) {
    const itemId = Number(thesis.item_id);
    const snapshot = snapshotByItem.get(itemId);
    if (!snapshot?.last_price) continue;

    // If user configured explicit targets, use them.
    if (thesis.target_buy && snapshot.last_price <= thesis.target_buy) {
      const score = 76;
      actions.push({
        type: 'entry_window',
        item_id: itemId,
        item_name: thesis.item_name,
        reason: `Entry window detected (${Math.round(snapshot.last_price).toLocaleString()} <= ${thesis.target_buy.toLocaleString()}).`,
        priority: computePriority(score),
        score,
      });
      continue;
    }

    // If no targets yet, still surface a "watch / consider" action based on current spread.
    if (!thesis.target_buy && !thesis.target_sell && snapshot.margin && snapshot.margin > 0) {
      const spreadPct = Math.min(100, (snapshot.margin / Math.max(snapshot.last_price, 1)) * 100);

      // MVP noise control for Ray (30M+): ignore tiny spreads.
      const MIN_SPREAD_PCT = 2.0;
      if (spreadPct >= MIN_SPREAD_PCT) {
        const buyLimit = buyLimitByItem.get(itemId) ?? 0;
        const qtyByCap = Math.floor(PER_FLIP_CAP_GP / Math.max(snapshot.last_price, 1));

        // Liquidity-aware quantity: avoid recommending size that exceeds a chunk of hourly volume.
        // (volume_1h is unit volume; we take 5% as a conservative "fillable" slice.)
        const volume1h = typeof snapshot.volume_1h === 'number' ? snapshot.volume_1h : null;
        const qtyByVolume = volume1h && volume1h > 0 ? Math.max(1, Math.floor(volume1h * 0.05)) : null;

        const unclampedSuggestedQty = buyLimit > 0 ? Math.max(1, Math.min(buyLimit, qtyByCap)) : Math.max(1, qtyByCap);
        const suggestedQty = typeof qtyByVolume === 'number'
          ? Math.max(1, Math.min(unclampedSuggestedQty, qtyByVolume))
          : unclampedSuggestedQty;

        const score = Math.max(50, Math.min(82, Math.round(spreadPct * 10)));

        // Heuristic prices: prefer last_low/last_high from OSRS Wiki latest snapshot.
        // Fallback to last_price +/- margin if needed.
        const buyAt = typeof snapshot.last_low === 'number' && snapshot.last_low > 0
          ? Math.max(1, Math.round(snapshot.last_low))
          : snapshot.last_price && snapshot.margin
            ? Math.max(1, Math.round(snapshot.last_price - snapshot.margin))
            : snapshot.last_price
              ? Math.max(1, Math.round(snapshot.last_price * 0.998))
              : null;

        const sellAt = typeof snapshot.last_high === 'number' && snapshot.last_high > 0
          ? Math.max(1, Math.round(snapshot.last_high))
          : snapshot.last_price && snapshot.margin
            ? Math.max(1, Math.round(snapshot.last_price))
            : snapshot.last_price
              ? Math.max(1, Math.round(snapshot.last_price * 1.002))
              : null;

        const estProfit = buyAt && sellAt
          ? Math.max(0, Math.round((sellAt - buyAt) * suggestedQty))
          : null;

        const spreadPctRounded = Number(spreadPct.toFixed(2));
        const reasonParts: string[] = [`Spread ~${spreadPctRounded.toFixed(1)}%`];
        if (typeof buyAt === 'number') reasonParts.push(`buy ~${buyAt.toLocaleString()} gp`);
        if (typeof sellAt === 'number') reasonParts.push(`sell ~${sellAt.toLocaleString()} gp`);
        reasonParts.push(`qty ${suggestedQty.toLocaleString()}`);
        if (typeof estProfit === 'number') reasonParts.push(`est ~${estProfit.toLocaleString()} gp`);
        if (typeof volume1h === 'number' && volume1h > 0) {
          reasonParts.push(`vol 1h ~${Math.round(volume1h).toLocaleString()}`);
          if (typeof qtyByVolume === 'number' && unclampedSuggestedQty > qtyByVolume) {
            reasonParts.push('qty capped by liquidity');
          }
        }

        actions.push({
          type: 'consider_entry',
          item_id: itemId,
          item_name: thesis.item_name,
          reason: reasonParts.join(' · '),
          priority: computePriority(score),
          score,
          suggested_buy: buyAt ?? undefined,
          suggested_sell: sellAt ?? undefined,
          spread_pct: spreadPctRounded,
          suggested_qty: suggestedQty,
          est_profit: estProfit ?? undefined,
        });
      }
    }
  }

  for (const alert of alertsRes.data ?? []) {
    const score = alert.severity === 'high' ? 88 : 62;
    actions.push({
      type: 'alert',
      item_id: alert.item_id ?? undefined,
      item_name: alert.title,
      reason: `Open ${alert.severity} alert requires review.`,
      priority: computePriority(score),
      score,
    });
  }

  const deduped = new Map<string, NextBestAction>();
  for (const action of actions) {
    const key = `${action.type}:${action.item_id ?? action.item_name}`;
    const existing = deduped.get(key);
    if (!existing || existing.score < action.score) {
      deduped.set(key, action);
    }
  }

  const sortedActions = Array.from(deduped.values()).sort((a, b) => b.score - a.score);
  const queue = sortedActions.slice(0, 5);
  const visibleActions = sortedActions.slice(0, 15);

  const positionRows = positionsRes.data ?? [];
  const estimatedUnrealizedProfit = positionRows.reduce((sum, row) => sum + Number((row as any).unrealized_profit ?? 0), 0);
  const totalRealizedProfit = positionRows.reduce((sum, row) => sum + Number((row as any).realized_profit ?? 0), 0);
  const highPriorityActions = sortedActions.filter((action) => action.priority === 'high').length;

  if (criticalMessages.length > 0) {
    const preview = criticalMessages.slice(0, 4).join(' | ');
    await sendDiscordAlert(`Action required: ${preview}`);
  }

  return NextResponse.json({
    actions: visibleActions,
    queue,
    positions: positionRows,
    summary: {
      open_positions: positionRows.length,
      queued_actions: queue.length,
      high_priority_actions: highPriorityActions,
      estimated_unrealized_profit: estimatedUnrealizedProfit,
      total_realized_profit: totalRealizedProfit,
    },
  });
}
