import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

type PoolItem = {
  item_id: number;
  item_name: string;
  priority: number | null;
  enabled: boolean;
};

type ActionPriority = 'high' | 'medium' | 'low';

function toPriority(score: number | null | undefined): ActionPriority {
  const val = Number(score ?? 0);
  if (val >= 85) return 'high';
  if (val >= 65) return 'medium';
  return 'low';
}

export async function POST() {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use admin client for DB ops to avoid RLS/privilege issues on server routes.
  const admin = createSupabaseAdmin();

  // Pull enabled pool items (curated list lives here)
  const poolRes = await admin
    .from('custom_pool_items')
    .select('item_id,item_name,priority,enabled')
    .eq('enabled', true)
    .order('priority', { ascending: false });

  if (poolRes.error) {
    return NextResponse.json({ error: poolRes.error.message }, { status: 500 });
  }

  const poolItems = (poolRes.data ?? []) as PoolItem[];
  if (poolItems.length === 0) {
    return NextResponse.json({ inserted: 0, reason: 'Pool is empty' });
  }

  // Existing theses for user
  const existingRes = await admin.from('theses').select('item_id').eq('user_id', userId);
  if (existingRes.error) {
    return NextResponse.json({ error: existingRes.error.message }, { status: 500 });
  }

  const existing = new Set<number>((existingRes.data ?? []).map((r) => Number(r.item_id)));

  const toInsert = poolItems
    .filter((row) => !existing.has(Number(row.item_id)))
    .map((row) => ({
      user_id: userId,
      item_id: Number(row.item_id),
      item_name: row.item_name,
      target_buy: null,
      target_sell: null,
      priority: toPriority(row.priority),
      notes: null,
      active: true,
    }));

  if (toInsert.length === 0) {
    return NextResponse.json({ inserted: 0, reason: 'Already seeded' });
  }

  const insertRes = await admin.from('theses').insert(toInsert);
  if (insertRes.error) {
    return NextResponse.json({ error: insertRes.error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: toInsert.length });
}
