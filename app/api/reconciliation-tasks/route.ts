import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type TaskStatus = 'pending' | 'approved' | 'rejected';

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

  const { error } = await supabase
    .from('reconciliation_tasks')
    .update({
      status: body.status,
      decided_at: new Date().toISOString(),
      decision_note: body.decision_note ?? null,
    })
    .eq('id', body.id)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
