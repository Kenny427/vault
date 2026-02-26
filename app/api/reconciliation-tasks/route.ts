import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type TaskStatus = 'pending' | 'approved' | 'rejected';

type ReconciliationTaskRow = {
  id: string;
  user_id: string;
  task_type: string;
  item_id: number | null;
  item_name: string | null;
  status: TaskStatus;
  details: any;
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
};

async function applyApprovedTask(supabase: ReturnType<typeof createServerSupabaseClient>, task: ReconciliationTaskRow) {
  if (task.task_type !== 'sell_exceeds_position') {
    return;
  }

  const event = task.details?.event as { item_id?: number; quantity?: number; price?: number; item_name?: string } | undefined;
  const itemId = Number(event?.item_id ?? task.item_id ?? 0);
  const eventQty = Number(event?.quantity ?? 0);
  const eventPrice = Number(event?.price ?? 0);

  if (!itemId || !eventQty || !eventPrice) {
    throw new Error('Reconciliation task is missing event.item_id/quantity/price');
  }

  const { data: existingPosition, error: positionError } = await supabase
    .from('positions')
    .select('id,quantity,avg_buy_price,realized_profit,item_name')
    .eq('user_id', task.user_id)
    .eq('item_id', itemId)
    .maybeSingle();

  if (positionError) throw new Error(positionError.message);

  const previousQty = Number(existingPosition?.quantity ?? 0);
  const existingAvg = Number(existingPosition?.avg_buy_price ?? 0);
  const realizedProfit = Number(existingPosition?.realized_profit ?? 0);

  // We only have cost basis for what we already tracked. If the sell exceeds the position,
  // we treat it as closing the tracked position (qty -> 0) and realize profit for the tracked qty.
  const sellQty = Math.min(previousQty, eventQty);
  const nextQty = Math.max(0, previousQty - sellQty);
  const nextRealized = realizedProfit + sellQty * (eventPrice - existingAvg);

  const { error: upsertError } = await supabase
    .from('positions')
    .upsert(
      {
        id: existingPosition?.id,
        user_id: task.user_id,
        item_id: itemId,
        item_name: (event?.item_name ?? task.item_name ?? existingPosition?.item_name ?? `Item ${itemId}`) as string,
        quantity: nextQty,
        avg_buy_price: nextQty > 0 ? existingAvg : 0,
        last_price: eventPrice,
        realized_profit: nextRealized,
        unrealized_profit: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,item_id' }
    );

  if (upsertError) throw new Error(upsertError.message);
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('reconciliation_tasks')
    .select('id,task_type,item_id,item_name,status,details,created_at,decided_at,decision_note')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        id?: string;
        status?: TaskStatus;
        decision_note?: string;
      }
    | null;

  if (!body?.id || !body?.status || !['approved', 'rejected'].includes(body.status)) {
    return NextResponse.json({ error: 'Expected { id, status: "approved"|"rejected", decision_note? }' }, { status: 400 });
  }

  const { data: task, error: taskError } = await supabase
    .from('reconciliation_tasks')
    .select('id,user_id,task_type,item_id,item_name,status,details,created_at,decided_at,decision_note')
    .eq('id', body.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Idempotency: if already decided, do nothing.
  if (task.status !== 'pending') {
    return NextResponse.json({ ok: true, skipped: true, reason: `Task already ${task.status}` });
  }

  try {
    if (body.status === 'approved') {
      await applyApprovedTask(supabase, task as ReconciliationTaskRow);
    }

    const { error: updateError } = await supabase
      .from('reconciliation_tasks')
      .update({
        status: body.status,
        decided_at: new Date().toISOString(),
        decision_note: body.decision_note ?? null,
      })
      .eq('id', body.id)
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to apply reconciliation task' }, { status: 500 });
  }
}
