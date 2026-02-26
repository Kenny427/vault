import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getFiveMinute, getLatest, getMapping, getOneHour } from '@/lib/market/osrsWiki';

type MappingItem = {
  id: number;
  name: string;
  examine?: string;
  limit?: number;
  value?: number;
  members?: boolean;
};

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = process.env.VAULT_USER_ID;
  if (!userId) {
    return NextResponse.json({ error: 'Missing VAULT_USER_ID env var' }, { status: 500 });
  }

  const supabase = createSupabaseAdmin();

  const thesesRes = await supabase
    .from('theses')
    .select('item_id')
    .eq('user_id', userId)
    .eq('active', true);

  if (thesesRes.error) {
    return NextResponse.json({ error: thesesRes.error.message }, { status: 500 });
  }

  const watchItemIds = Array.from(new Set<number>((thesesRes.data ?? []).map((r) => Number(r.item_id))));
  if (watchItemIds.length === 0) {
    return NextResponse.json({ refreshed: 0, skipped: true, reason: 'No active theses' });
  }

  const [mapping, latest, fiveMinute, oneHour] = await Promise.all([getMapping(), getLatest(), getFiveMinute(), getOneHour()]);
  const mappingById = new Map<number, MappingItem>();
  for (const entry of mapping as MappingItem[]) {
    mappingById.set(entry.id, entry);
  }

  const nowIso = new Date().toISOString();

  const items = watchItemIds.map((itemId) => {
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

  const snapshots = watchItemIds.map((itemId) => {
    const latestRow = (latest as any)[String(itemId)] ?? {};
    const fiveMinuteRow = (fiveMinute as any)[String(itemId)] ?? {};
    const oneHourRow = (oneHour as any)[String(itemId)] ?? {};

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
      volume_5m: (Number(fiveMinuteRow.highPriceVolume ?? 0) + Number(fiveMinuteRow.lowPriceVolume ?? 0)) || null,
      volume_1h: (Number(oneHourRow.highPriceVolume ?? 0) + Number(oneHourRow.lowPriceVolume ?? 0)) || null,
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

  return NextResponse.json({ refreshed: watchItemIds.length, at: nowIso });
}
