import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type DinkEventPayload = {
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

async function getUserId() {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  return { supabase, userId: auth.user?.id ?? null };
}

export async function GET() {
  const { supabase, userId } = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('reconciliation_tasks')
    .select('id,source,kind,status,payload,created_at,updated_at,decided_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { supabase, userId } = await getUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as { id?: string; action?: 'approve' | 'reject' };
  if (!body.id || !body.action) {
    return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
  }

  const { data: task, error: taskError } = await supabase
    .from('reconciliation_tasks')
    .select('id,status,payload')
    .eq('id', body.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (task.status !== 'pending') {
    return NextResponse.json({ ok: true, status: task.status });
  }

  if (body.action === 'reject') {
    const { error: rejectError } = await supabase
      .from('reconciliation_tasks')
      .update({ status: 'rejected', decided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', body.id)
      .eq('user_id', userId);

    if (rejectError) return NextResponse.json({ error: rejectError.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  const payload = (task.payload ?? {}) as DinkEventPayload;
  const itemId = Number(payload.item_id ?? 0);
  const quantity = Number(payload.quantity ?? 0);
  const price = Number(payload.price ?? 0);
  const side = payload.side === 'sell' ? 'sell' : 'buy';

  if (!itemId || !quantity || !price) {
    return NextResponse.json({ error: 'Task payload missing item_id/quantity/price' }, { status: 400 });
  }

  const { data: existingPosition, error: posError } = await supabase
    .from('positions')
    .select('id,quantity,avg_buy_price,realized_profit,item_name')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (posError) return NextResponse.json({ error: posError.message }, { status: 500 });

  const previousQty = Number(existingPosition?.quantity ?? 0);
  const existingAvg = Number(existingPosition?.avg_buy_price ?? 0);
  const realizedProfit = Number(existingPosition?.realized_profit ?? 0);

  let nextQty = previousQty;
  let nextAvg = existingAvg;
  let nextRealized = realizedProfit;

  if (side === 'buy') {
    const totalCost = previousQty * existingAvg + quantity * price;
    nextQty = previousQty + quantity;
    nextAvg = nextQty > 0 ? totalCost / nextQty : 0;
  } else {
    const sellQty = Math.min(quantity, previousQty);
    nextQty = previousQty - sellQty;
    nextRealized = realizedProfit + sellQty * (price - existingAvg);
    if (nextQty <= 0) {
      nextQty = 0;
      nextAvg = 0;
    }
  }

  const { error: upsertError } = await supabase.from('positions').upsert(
    {
      id: existingPosition?.id,
      user_id: userId,
      item_id: itemId,
      item_name: payload.item_name ?? existingPosition?.item_name ?? `Item ${itemId}`,
      quantity: nextQty,
      avg_buy_price: nextAvg,
      last_price: price,
      realized_profit: nextRealized,
      unrealized_profit: nextQty > 0 ? (price - nextAvg) * nextQty : 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,item_id' }
  );

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  const { error: approveError } = await supabase
    .from('reconciliation_tasks')
    .update({ status: 'approved', decided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('user_id', userId);

  if (approveError) return NextResponse.json({ error: approveError.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: 'approved' });
}
