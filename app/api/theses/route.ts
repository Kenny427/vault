import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function getUserId() {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  return { supabase, userId: auth.user?.id ?? null };
}

export async function GET() {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('theses')
    .select('id,item_id,item_name,target_buy,target_sell,priority,notes,active,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ theses: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    item_id: number;
    item_name: string;
    target_buy?: number | null;
    target_sell?: number | null;
    priority?: 'high' | 'medium' | 'low';
    notes?: string | null;
    active?: boolean;
  };

  if (!body.item_id || !body.item_name) {
    return NextResponse.json({ error: 'item_id and item_name are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('theses')
    .insert({
      user_id: userId,
      item_id: body.item_id,
      item_name: body.item_name,
      target_buy: body.target_buy ?? null,
      target_sell: body.target_sell ?? null,
      priority: body.priority ?? 'medium',
      notes: body.notes ?? null,
      active: body.active ?? true,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ thesis: data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    id: string;
    item_name?: string;
    target_buy?: number | null;
    target_sell?: number | null;
    priority?: 'high' | 'medium' | 'low';
    notes?: string | null;
    active?: boolean;
  };

  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const updatePayload = {
    item_name: body.item_name,
    target_buy: body.target_buy,
    target_sell: body.target_sell,
    priority: body.priority,
    notes: body.notes,
    active: body.active,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('theses')
    .update(updatePayload)
    .eq('id', body.id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ thesis: data });
}

export async function DELETE(request: NextRequest) {
  const { supabase, userId } = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const search = request.nextUrl.searchParams;
  const id = search.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabase.from('theses').delete().eq('id', id).eq('user_id', userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
