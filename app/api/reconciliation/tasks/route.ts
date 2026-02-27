import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendDiscordAlert } from '@/lib/server/discord';

const ALLOWED_STATUSES = new Set(['approved', 'rejected']);

type Task = {
  id: string;
  item_id: number | null;
  item_name: string | null;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  occurred_at: string | null;
  reason: string | null;
  status: string;
  created_at: string;
};

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const statusParam = request.nextUrl.searchParams.get('status')?.toLowerCase() ?? 'pending';
  const wantsAll = statusParam === 'all';

  if (!wantsAll && statusParam !== 'pending' && !ALLOWED_STATUSES.has(statusParam)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }

  let query = supabase
    .from('reconciliation_tasks')
    .select('id,item_id,item_name,side,quantity,price,occurred_at,reason,status,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!wantsAll) {
    query = query.eq('status', statusParam);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: (data ?? []) as Task[] });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { id?: string; status?: string } | null;

  if (!body?.id || !body.status || !ALLOWED_STATUSES.has(body.status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('reconciliation_tasks')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', body.id)
    .select('id,status')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Send Discord notification for the decision
  const statusText = body.status === 'approved' ? '✅ Approved' : '❌ Rejected';
  const taskId = body.id.slice(0, 8);
  sendDiscordAlert(`${statusText} reconciliation task \`${taskId}\``).catch(() => {});

  return NextResponse.json({ ok: true, task: data });
}
