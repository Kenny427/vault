import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

type GeEventRow = {
  rsn: string | null;
  item_id: number | null;
  item_name: string | null;
  qty: number | null;
  price_each: number | null;
  side: 'buy' | 'sell';
  event_time: string;
};

type PositionAccumulator = {
  rsn: string;
  item_id: number;
  item_name: string;
  buy_qty: number;
  sell_qty: number;
  buy_notional: number;
  realized_pnl_gp: number;
  last_event_time: string;
};

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('ge_events')
      .select('rsn,item_id,item_name,qty,price_each,side,event_time')
      .eq('user_id', user.id)
      .order('event_time', { ascending: true });

    if (error) {
      console.error('Failed to fetch ge_events for positions:', error);
      return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
    }

    const byKey = new Map<string, PositionAccumulator>();

    for (const event of (data || []) as GeEventRow[]) {
      if (event.item_id === null) continue;

      const rsn = event.rsn || 'Unknown';
      const key = `${rsn}::${event.item_id}`;

      if (!byKey.has(key)) {
        byKey.set(key, {
          rsn,
          item_id: event.item_id,
          item_name: event.item_name || `Item ${event.item_id}`,
          buy_qty: 0,
          sell_qty: 0,
          buy_notional: 0,
          realized_pnl_gp: 0,
          last_event_time: event.event_time,
        });
      }

      const acc = byKey.get(key)!;
      const qty = Math.max(0, event.qty || 0);
      const priceEach = Math.max(0, event.price_each || 0);

      if (event.item_name) {
        acc.item_name = event.item_name;
      }
      if (event.event_time > acc.last_event_time) {
        acc.last_event_time = event.event_time;
      }

      if (event.side === 'buy') {
        acc.buy_qty += qty;
        acc.buy_notional += qty * priceEach;
      } else {
        acc.sell_qty += qty;
        const avgCost = acc.buy_qty > 0 ? acc.buy_notional / acc.buy_qty : 0;
        acc.realized_pnl_gp += qty * (priceEach - avgCost);
      }
    }

    const positions = Array.from(byKey.values())
      .map((acc) => {
        const netQty = acc.buy_qty - acc.sell_qty;
        const avgBuyPrice = acc.buy_qty > 0 ? acc.buy_notional / acc.buy_qty : 0;
        return {
          rsn: acc.rsn,
          item_id: acc.item_id,
          item_name: acc.item_name,
          net_qty: netQty,
          avg_buy_price: Number(avgBuyPrice.toFixed(2)),
          realized_pnl_gp: Number(acc.realized_pnl_gp.toFixed(2)),
          last_event_time: acc.last_event_time,
        };
      })
      .filter((position) => position.net_qty > 0)
      .sort((a, b) => b.last_event_time.localeCompare(a.last_event_time));

    return NextResponse.json({ positions });
  } catch (error) {
    console.error('Positions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
