import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type PortfolioPosition = {
  item_id: number;
  item_name: string;
  quantity: number;
  avg_buy_price: number;
  last_price: number | null;
  realized_profit: number | null;
  unrealized_profit: number | null;
  updated_at: string | null;
};

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('positions')
    .select('item_id,item_name,quantity,avg_buy_price,last_price,realized_profit,unrealized_profit,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const positions = (data ?? []) as PortfolioPosition[];

  // Calculate totals
  let totalValue = 0;
  let totalInvested = 0;
  let totalRealizedProfit = 0;
  let totalUnrealizedProfit = 0;

  for (const pos of positions) {
    const lastPrice = pos.last_price ?? pos.avg_buy_price;
    totalValue += lastPrice * pos.quantity;
    totalInvested += pos.avg_buy_price * pos.quantity;
    totalRealizedProfit += Number(pos.realized_profit ?? 0);
    totalUnrealizedProfit += Number(pos.unrealized_profit ?? 0);
  }

  const totalProfit = totalRealizedProfit + totalUnrealizedProfit;

  return NextResponse.json({
    positions,
    summary: {
      total_value: Math.round(totalValue),
      total_invested: Math.round(totalInvested),
      total_realized_profit: Math.round(totalRealizedProfit),
      total_unrealized_profit: Math.round(totalUnrealizedProfit),
      total_profit: Math.round(totalProfit),
      position_count: positions.length,
    },
  });
}
