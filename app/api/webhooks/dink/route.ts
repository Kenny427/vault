import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';
import { sendDiscordAlert } from '@/lib/server/discord';

type DinkEvent = {
  user_id?: string;
  profile_id?: string;
  rsn?: string;
  item_id?: number;
  item_name?: string;
  quantity?: number;
  price?: number;
  side?: 'buy' | 'sell';
  status?: string;
  timestamp?: string;
  event_hash?: string;
};

function toIsoSecond(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 19) + 'Z';
  }

  // Stable timestamp for hashing (rounded to seconds)
  return new Date(Math.floor(date.getTime() / 1000) * 1000).toISOString().slice(0, 19) + 'Z';
}

function computeEventHash(event: Omit<DinkEvent, 'event_hash'>) {
  const userKey =
    event.user_id ??
    (event.profile_id || event.rsn ? `profile:${event.profile_id ?? ''}|rsn:${event.rsn ?? ''}` : 'anon');

  const key = [
    userKey,
    event.item_id ?? '',
    event.quantity ?? '',
    event.price ?? '',
    event.side ?? '',
    event.status ?? '',
    event.timestamp ?? '',
  ].join('|');

  return crypto.createHash('sha256').update(key).digest('hex');
}

function normalizeEvent(input: Record<string, unknown>): DinkEvent {
  const rawSide = String(input.side ?? input.type ?? '').toLowerCase();
  const side = rawSide.includes('sell') ? 'sell' : 'buy';

  const baseEvent: Omit<DinkEvent, 'event_hash'> = {
    user_id: (input.user_id as string | undefined) ?? (input.userId as string | undefined),
    profile_id: (input.profile_id as string | undefined) ?? (input.profileId as string | undefined),
    rsn: (input.rsn as string | undefined) ?? (input.username as string | undefined),
    item_id: Number(input.item_id ?? input.itemId ?? 0) || undefined,
    item_name: (input.item_name as string | undefined) ?? (input.itemName as string | undefined),
    quantity: Number(input.quantity ?? 0) || undefined,
    price: Number(input.price ?? input.unit_price ?? 0) || undefined,
    side,
    status: (input.status as string | undefined) ?? 'filled',
    timestamp: toIsoSecond((input.timestamp as string | undefined) ?? new Date().toISOString()),
  };

  return {
    ...baseEvent,
    event_hash: computeEventHash(baseEvent),
  };
}

export async function GET() {
  // Authenticated polling endpoint for the frontend (e.g. legacy DINK poller)
  // Returns the most recent order_attempts for the current user.
  const supabase = createServerSupabaseClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('order_attempts')
    .select('id,item_id,item_name,side,quantity,price,status,placed_at,raw_payload')
    .eq('user_id', userData.user.id)
    .order('placed_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const parsedTransactions = (data ?? []).map((row: any) => {
    const raw = row.raw_payload ?? {};
    const username = raw.rsn ?? raw.username ?? raw.user ?? undefined;

    return {
      id: row.id,
      username,
      type: String(row.side ?? '').toUpperCase(),
      itemName: row.item_name,
      status: row.status,
      timestamp: row.placed_at ? Date.parse(row.placed_at) : Date.now(),
      quantity: row.quantity,
      price: row.price,
      itemId: row.item_id,
    };
  });

  return NextResponse.json({ parsedTransactions });
}

export async function POST(request: NextRequest) {
  const secret = process.env.DINK_WEBHOOK_SECRET;
  const providedSecret = request.headers.get('x-dink-secret');

  if (secret && providedSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown> | Record<string, unknown>[];
  const rawEvents = Array.isArray(body) ? body : [body];
  const events = rawEvents
    .map(normalizeEvent)
    .filter((event) => event.item_id && event.quantity && event.price && event.event_hash);

  if (events.length === 0) {
    return NextResponse.json({ ingested: 0, warning: 'No actionable events found.' });
  }

  const admin = createServiceRoleSupabaseClient();

  const geEventsInsert = await admin.from('ge_events').upsert(
    events.map((event) => ({
      user_id: event.user_id,
      profile_id: event.profile_id,
      rsn: event.rsn,
      item_id: event.item_id,
      item_name: event.item_name,
      quantity: event.quantity,
      price: event.price,
      side: event.side,
      status: event.status,
      occurred_at: event.timestamp,
      event_hash: event.event_hash,
      raw_payload: event,
    })),
    { onConflict: 'event_hash', ignoreDuplicates: true }
  );

  if (geEventsInsert.error) {
    return NextResponse.json({ error: geEventsInsert.error.message }, { status: 500 });
  }

  const orderAttemptsInsert = await admin.from('order_attempts').upsert(
    events.map((event) => ({
      user_id: event.user_id,
      item_id: event.item_id,
      item_name: event.item_name,
      side: event.side,
      quantity: event.quantity,
      price: event.price,
      status: event.status,
      source: 'dink',
      placed_at: event.timestamp,
      event_hash: event.event_hash,
      raw_payload: event,
    })),
    { onConflict: 'event_hash', ignoreDuplicates: true }
  );

  if (orderAttemptsInsert.error) {
    return NextResponse.json({ error: orderAttemptsInsert.error.message }, { status: 500 });
  }

  for (const event of events) {
    if (!event.user_id || !event.item_id || !event.quantity || !event.price) {
      continue;
    }

    const { data: existingPosition } = await admin
      .from('positions')
      .select('id,quantity,avg_buy_price,realized_profit,item_name')
      .eq('user_id', event.user_id)
      .eq('item_id', event.item_id)
      .maybeSingle();

    const previousQty = Number(existingPosition?.quantity ?? 0);
    const existingAvg = Number(existingPosition?.avg_buy_price ?? 0);
    const realizedProfit = Number(existingPosition?.realized_profit ?? 0);

    let nextQty = previousQty;
    let nextAvg = existingAvg;
    let nextRealized = realizedProfit;

    if (event.side === 'buy') {
      const totalCost = previousQty * existingAvg + event.quantity * event.price;
      nextQty = previousQty + event.quantity;
      nextAvg = nextQty > 0 ? totalCost / nextQty : 0;
    } else {
      const sellQty = Math.min(event.quantity, previousQty);
      const reconciliationNeeded = previousQty <= 0 || event.quantity > previousQty;

      if (reconciliationNeeded) {
        const shortfall = Math.max(event.quantity - previousQty, 0);
        const reason = previousQty <= 0
          ? 'Sell event received but no open position exists in Vault ledger.'
          : `Sell event exceeds position quantity by ${shortfall}.`;

        await admin.from('reconciliation_tasks').insert({
          user_id: event.user_id,
          item_id: event.item_id,
          item_name: event.item_name ?? existingPosition?.item_name ?? `Item ${event.item_id}`,
          side: 'sell',
          quantity: event.quantity,
          price: event.price,
          occurred_at: event.timestamp,
          reason,
          status: 'pending',
          raw_payload: event,
          updated_at: new Date().toISOString(),
        });

        // Notify in Discord
        const itemName = event.item_name ?? existingPosition?.item_name ?? `Item ${event.item_id}`;
        await sendDiscordAlert(
          `⚠️ Reconciliation task created: Sold ${event.quantity}x ${itemName} @ ${event.price.toLocaleString()}gp but no/insufficient position in Vault. Needs review.`
        );
      }

      nextQty = previousQty - sellQty;
      nextRealized = realizedProfit + sellQty * (event.price - existingAvg);
      if (nextQty <= 0) {
        nextQty = 0;
        nextAvg = 0;
      }
    }

    await admin.from('positions').upsert(
      {
        id: existingPosition?.id,
        user_id: event.user_id,
        item_id: event.item_id,
        item_name: event.item_name ?? existingPosition?.item_name ?? `Item ${event.item_id}`,
        quantity: nextQty,
        avg_buy_price: nextAvg,
        last_price: event.price,
        realized_profit: nextRealized,
        unrealized_profit: nextQty > 0 ? (event.price - nextAvg) * nextQty : 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,item_id' }
    );

    // Notify on new position opened
    if (event.side === 'buy' && previousQty === 0 && nextQty > 0) {
      const itemName = event.item_name ?? `Item ${event.item_id}`;
      await sendDiscordAlert(
        `📈 New position opened: Bought ${event.quantity}x ${itemName} @ ${event.price.toLocaleString()}gp (avg: ${Math.round(nextAvg).toLocaleString()}gp)`
      );
    }
  }

  return NextResponse.json({ ingested: events.length });
}
