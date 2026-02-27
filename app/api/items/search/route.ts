import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  
  // Allow unauthenticated search for command palette
  const query = request.nextUrl.searchParams.get('q')?.toLowerCase() ?? '';
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 20), 50);

  if (query.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('items')
    .select('item_id,name,members,buy_limit,alch_value')
    .ilike('name', `%${query}%`)
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map to simpler format for command palette
  const items = (data ?? []).map(item => ({
    id: item.item_id,
    name: item.name,
  }));

  return NextResponse.json(items);
}
