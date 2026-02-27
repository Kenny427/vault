import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendDiscordAlert } from '@/lib/server/discord';

type Proposal = {
  id: string;
  description: string;
  item_id?: number;
  item_name?: string;
  side?: 'buy' | 'sell';
  quantity?: number;
  price?: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposals: (data ?? []) as Proposal[] });
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { description: string; item_id?: number; item_name?: string; side?: 'buy' | 'sell'; quantity?: number; price?: number } | null;

  if (!body?.description) {
    return NextResponse.json({ error: 'Description required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('proposals')
    .insert({
      user_id: userId,
      description: body.description,
      item_id: body.item_id,
      item_name: body.item_name,
      side: body.side,
      quantity: body.quantity,
      price: body.price,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposal: data as Proposal }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { id: string; status: 'approved' | 'rejected' } | null;

  if (!body?.id || !body?.status || !['approved', 'rejected'].includes(body.status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('proposals')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send Discord notification for the decision
  const statusText = body.status === 'approved' ? '✅ Approved' : '❌ Rejected';
  const proposalId = body.id.slice(0, 8);
  const itemName = data?.item_name ? ` · ${data.item_name}` : '';
  sendDiscordAlert(`${statusText} proposal \`${proposalId}\`${itemName}`).catch(() => {});

  return NextResponse.json({ proposal: data as Proposal });
}
