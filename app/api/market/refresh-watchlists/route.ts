import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getFiveMinute, getLatest, getMapping, getOneHour } from '@/lib/market/osrsWiki';

type MappingItem = {
  id: number;
  name: string;
  examine?: string;
  limit?: number;
  value?: number;
  members?: boolean;
};

export async function POST() {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [thesesRes, positionsRes] = await Promise.all([
    supabase.from('theses').select('item_id').eq('user_id', userId).eq('active', true),
    supabase.from('positions').select('item_id').eq('user_id', userId).neq('quantity', 0),
  ]);

  if (thesesRes.error || positionsRes.error) {
    return NextResponse.json({ error: thesesRes.error?.message ?? positionsRes.error?.message ?? 'Failed to load watchlist' }, { status: 500 });
  }

  const watchItemIds = new Set<number>();
  for (const row of thesesRes.data ?? []) watchItemIds.add(Number(row.item_id));
  for (const row of positionsRes.data ?? []) watchItemIds.add(Number(row.item_id));

  if (watchItemIds.size === 0) {
    return NextResponse.json({ refreshed: 0, skipped: true });
  }

  const [mapping, latest, fiveMinute, oneHour] = await Promise.all([getMapping(), getLatest(), getFiveMinute(), getOneHour()]);
  const mappingById = new Map<number, MappingItem>();
  for (const entry of mapping as MappingItem[]) {
    mappingById.set(entry.id, entry);
  }

  const nowIso = new Date().toISOString();

  const items = Array.from(watchItemIds).map((itemId) => {
    const mapped = mappingById.get(itemId);
    return {
      item_id: itemId,
      name: mapped?.name ?? `Item ${itemId}`,
      examine: mapped?.examine ?? null,
      buy_limit: mapped?.limit ?? null,
      alch_value: mapped?.value ?? null,
      members: mapped?.members ?? null,
      updated_at: nowIso,
    };
  });

  const snapshots = Array.from(watchItemIds).map((itemId) => {
    const latestRow = latest[String(itemId)] ?? {};
    const fiveMinuteRow = fiveMinute[String(itemId)] ?? {};
    const oneHourRow = oneHour[String(itemId)] ?? {};

    const lastHigh = Number(latestRow.high ?? 0);
    const lastLow = Number(latestRow.low ?? 0);

    return {
      user_id: userId,
      item_id: itemId,
      last_price: lastHigh > 0 ? lastHigh : lastLow > 0 ? lastLow : null,
      last_high: lastHigh || null,
      last_low: lastLow || null,
      price_5m_high: Number(fiveMinuteRow.avgHighPrice ?? 0) || null,
      price_5m_low: Number(fiveMinuteRow.avgLowPrice ?? 0) || null,
      price_1h_high: Number(oneHourRow.avgHighPrice ?? 0) || null,
      price_1h_low: Number(oneHourRow.avgLowPrice ?? 0) || null,
      volume_5m: Number(fiveMinuteRow.highPriceVolume ?? 0) + Number(fiveMinuteRow.lowPriceVolume ?? 0) || null,
      volume_1h: Number(oneHourRow.highPriceVolume ?? 0) + Number(oneHourRow.lowPriceVolume ?? 0) || null,
      margin:
        lastHigh > 0 && lastLow > 0
          ? Math.max(lastHigh - lastLow, 0)
          : Number(oneHourRow.avgHighPrice ?? 0) > 0 && Number(oneHourRow.avgLowPrice ?? 0) > 0
            ? Math.max(Number(oneHourRow.avgHighPrice) - Number(oneHourRow.avgLowPrice), 0)
            : null,
      snapshot_at: nowIso,
      updated_at: nowIso,
    };
  });

  const itemsUpsert = await supabase.from('items').upsert(items, { onConflict: 'item_id' });
  const snapshotsUpsert = await supabase.from('market_snapshots').upsert(snapshots, { onConflict: 'user_id,item_id' });

  if (itemsUpsert.error || snapshotsUpsert.error) {
    return NextResponse.json({
      error: itemsUpsert.error?.message ?? snapshotsUpsert.error?.message ?? 'Failed to persist market data',
    }, { status: 500 });
  }

  return NextResponse.json({ refreshed: snapshots.length, at: nowIso });
}
