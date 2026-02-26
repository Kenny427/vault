import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';

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
};

function normalizeEvent(input: Record<string, unknown>): DinkEvent {
  const rawSide = String(input.side ?? input.type ?? '').toLowerCase();
  const side = rawSide.includes('sell') ? 'sell' : 'buy';

  return {
    user_id: (input.user_id as string | undefined) ?? (input.userId as string | undefined),
    profile_id: (input.profile_id as string | undefined) ?? (input.profileId as string | undefined),
    rsn: (input.rsn as string | undefined) ?? (input.username as string | undefined),
    item_id: Number(input.item_id ?? input.itemId ?? 0) || undefined,
    item_name: (input.item_name as string | undefined) ?? (input.itemName as string | undefined),
    quantity: Number(input.quantity ?? 0) || undefined,
    price: Number(input.price ?? input.unit_price ?? 0) || undefined,
    side,
    status: (input.status as string | undefined) ?? 'filled',
    timestamp: (input.timestamp as string | undefined) ?? new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const secret = process.env.DINK_WEBHOOK_SECRET;
  const providedSecret = request.headers.get('x-dink-secret');

  if (secret && providedSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown> | Record<string, unknown>[];
  const rawEvents = Array.isArray(body) ? body : [body];
  const events = rawEvents.map(normalizeEvent).filter((event) => event.item_id && event.quantity && event.price);

  if (events.length === 0) {
    return NextResponse.json({ ingested: 0, warning: 'No actionable events found.' });
  }

  const admin = createServiceRoleSupabaseClient();

  const geEventsInsert = await admin.from('ge_events').insert(
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
      raw_payload: event,
    }))
  );

  if (geEventsInsert.error) {
    return NextResponse.json({ error: geEventsInsert.error.message }, { status: 500 });
  }

  const orderAttemptsInsert = await admin.from('order_attempts').insert(
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
      raw_payload: event,
    }))
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
  }

  return NextResponse.json({ ingested: events.length });
}
