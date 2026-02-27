import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = Number(id);

  if (!Number.isFinite(itemId) || itemId <= 0) {
    return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('items')
    .select('item_id, name, members, buy_limit, alch_value, icon_url')
    .eq('item_id', itemId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get icon URL from OSRS Wiki mapping
  const iconUrl = data.icon_url || `https://oldschool.runescape.wiki/images/${data.name.replace(/ /g, '_')}.png`;

  return NextResponse.json({
    item: {
      ...data,
      icon_url: iconUrl,
    },
  });
}
