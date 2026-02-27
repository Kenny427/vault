import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';
import { getLatest, getFiveMinute, getOneHour } from '@/lib/market/osrsWiki';

// Background job: fetch OSRS Wiki prices and update market_snapshots for all users with theses.
// GET: Trigger a manual ingest (admin/cron)
// POST: Same, but also returns results

interface WikiPriceData {
  high?: number | null;
  low?: number | null;
  highTime?: number | null;
  lowTime?: number | null;
}

interface FiveMinuteData {
  avgHighPrice?: number | null;
  avgLowPrice?: number | null;
  highPriceVolume?: number | null;
  lowPriceVolume?: number | null;
}

interface OneHourData {
  avgHighPrice?: number | null;
  avgLowPrice?: number | null;
  highPriceVolume?: number | null;
  lowPriceVolume?: number | null;
}

async function ingestPrices() {
  const admin = createServiceRoleSupabaseClient();

  // Fetch all data in parallel
  const [latest, fiveMin, oneHour] = await Promise.all([
    getLatest(),
    getFiveMinute(),
    getOneHour(),
  ]);

  // Store raw payload
  const rawPayload = { latest, fiveMin, oneHour, fetchedAt: new Date().toISOString() };
  await admin.from('osrs_wiki_latest_ingests').insert({
    source: 'prices.runescape.wiki/api/v1/osrs/latest',
    payload: rawPayload,
    fetched_at: new Date().toISOString(),
  });

  // Get all users with active theses
  const { data: theses, error: thesesError } = await admin
    .from('theses')
    .select('user_id, item_id')
    .eq('active', true);

  if (thesesError || !theses) {
    return { error: thesesError?.message ?? 'Failed to fetch theses', processed: 0 };
  }

  // Get unique user-item pairs
  const userItems = new Map<string, Set<number>>();
  for (const t of theses) {
    const userId = t.user_id;
    if (!userItems.has(userId)) {
      userItems.set(userId, new Set());
    }
    userItems.get(userId)!.add(Number(t.item_id));
  }

  let processed = 0;

  // Process each user's items
  for (const [userId, itemIds] of userItems) {
    for (const itemId of itemIds) {
      const wikiId = String(itemId);
      
      const latestData: WikiPriceData = latest[wikiId] || {};
      const fiveMinData: FiveMinuteData = fiveMin[wikiId] || {};
      const oneHourData: OneHourData = oneHour[wikiId] || {};

      const high = latestData.high ?? fiveMinData.avgHighPrice ?? oneHourData.avgHighPrice;
      const low = latestData.low ?? fiveMinData.avgLowPrice ?? oneHourData.avgLowPrice;

      // Calculate margin from high/low
      let margin = 0;
      if (high && low && high > 0 && low > 0) {
        margin = high - low;
      }

      // Upsert market snapshot
      const { error: upsertError } = await admin
        .from('market_snapshots')
        .upsert(
          {
            user_id: userId,
            item_id: itemId,
            last_price: high ?? null,
            last_high: high ?? null,
            last_low: low ?? null,
            price_5m_high: fiveMinData.avgHighPrice ?? null,
            price_5m_low: fiveMinData.avgLowPrice ?? null,
            price_1h_high: oneHourData.avgHighPrice ?? null,
            price_1h_low: oneHourData.avgLowPrice ?? null,
            margin,
            volume_5m: fiveMinData.highPriceVolume ?? fiveMinData.lowPriceVolume ?? null,
            volume_1h: oneHourData.highPriceVolume ?? oneHourData.lowPriceVolume ?? null,
            snapshot_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,item_id' }
        );

      if (!upsertError) {
        processed++;
      }
    }
  }

  return { processed, timestamp: new Date().toISOString() };
}

export async function GET(request: NextRequest) {
  // Allow cron job or admin to trigger
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // For now, allow any authenticated user to trigger (can be restricted later)
  const supabase = createServiceRoleSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  
  if (!authData?.user && (!cronSecret || authHeader?.replace('Bearer ', '') !== cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await ingestPrices();
    return NextResponse.json({ 
      success: true, 
      ...result 
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Same as GET but for webhook/cron use
  return GET(request);
}
