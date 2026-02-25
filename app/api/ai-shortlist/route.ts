import { NextResponse } from 'next/server';
import { analyzeFlipsWithAI } from '@/lib/aiAnalysis';
import { fetchItemMapping, getItemHistory, getItemPrice } from '@/lib/api/osrs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const maxItems = Number.isFinite(body?.maxItems) ? Math.min(Math.max(3, body.maxItems), 30) : 12;

    if (items.length === 0) {
      return NextResponse.json({ opportunities: [] });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ opportunities: [], error: 'AI disabled: OPENROUTER_API_KEY not configured' });
    }

    const mapping = await fetchItemMapping();
    const mapByName = new Map(mapping.map(item => [item.name.toLowerCase(), item]));

    const shortlisted = items.slice(0, maxItems);
    const itemsWithData: Array<{
      id: number;
      name: string;
      currentPrice: number;
      history30: any[];
      history90: any[];
      history180: any[];
      history365: any[];
    }> = [];

    for (const item of shortlisted) {
      if (!item?.name) continue;
      const mapped = mapByName.get(String(item.name).toLowerCase());
      const resolvedId = mapped?.id ?? item.id;
      const resolvedName = mapped?.name ?? item.name;

      if (!resolvedId) continue;

      const price = await getItemPrice(resolvedId);
      const currentPrice = price ? (price.high + price.low) / 2 : undefined;
      if (!currentPrice) continue;

      const history30 = await getItemHistory(resolvedId, 30 * 24 * 60 * 60, currentPrice);
      const history90 = await getItemHistory(resolvedId, 90 * 24 * 60 * 60, currentPrice);
      const history180 = await getItemHistory(resolvedId, 180 * 24 * 60 * 60, currentPrice);
      const history365 = await getItemHistory(resolvedId, 365 * 24 * 60 * 60, currentPrice);

      if (history30 && history30.length > 0) {
        itemsWithData.push({
          id: resolvedId,
          name: resolvedName,
          currentPrice,
          history30,
          history90: history90 && history90.length > 0 ? history90 : history30,
          history180: history180 && history180.length > 0 ? history180 : history30,
          history365: history365 && history365.length > 0 ? history365 : history30,
        });
      }
    }

    if (itemsWithData.length === 0) {
      return NextResponse.json({ opportunities: [] });
    }

    const opportunities = await analyzeFlipsWithAI(itemsWithData);
    return NextResponse.json({ opportunities });
  } catch (error: any) {
    console.error('AI shortlist API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze shortlist' },
      { status: 500 }
    );
  }
}
