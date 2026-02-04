import { NextResponse } from 'next/server';
import { analyzeFlipsWithAI, clearAnalysisCache } from '@/lib/aiAnalysis';
import { getItemPrice, getItemHistory } from '@/lib/api/osrs';

export async function POST(request: Request) {
  try {
    const items = await request.json();
    const cappedItems = Array.isArray(items) ? items.slice(0, 50) : [];
    
    // Clear cache on each request (manual refresh behavior)
    clearAnalysisCache();
    
    const itemsWithData: Array<{
      id: number;
      name: string;
      currentPrice: number;
      history30: any[];
      history90: any[];
      history180: any[];
      history365: any[];
    }> = [];

    for (const item of cappedItems) {
      try {
        if (!item?.id || !item?.name) continue;

        const price = await getItemPrice(item.id);
        const currentPrice = price ? (price.high + price.low) / 2 : undefined;

        if (!currentPrice) continue;

        const history30 = await getItemHistory(item.id, 30 * 24 * 60 * 60, currentPrice);
        const history90 = await getItemHistory(item.id, 90 * 24 * 60 * 60, currentPrice);
        const history180 = await getItemHistory(item.id, 180 * 24 * 60 * 60, currentPrice);
        const history365 = await getItemHistory(item.id, 365 * 24 * 60 * 60, currentPrice);

        if (history30 && history30.length > 0) {
          itemsWithData.push({
            id: item.id,
            name: item.name,
            currentPrice,
            history30,
            history90: history90 && history90.length > 0 ? history90 : history30,
            history180: history180 && history180.length > 0 ? history180 : history30,
            history365: history365 && history365.length > 0 ? history365 : history30,
          });
        }
      } catch (error) {
        console.error(`Error fetching data for ${item?.name ?? 'unknown item'}:`, error);
      }
    }

    if (itemsWithData.length === 0) {
      return NextResponse.json([]);
    }

    const opportunities = await analyzeFlipsWithAI(itemsWithData);
    
    return NextResponse.json(opportunities);
  } catch (error: any) {
    console.error('AI analysis API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze opportunities' },
      { status: 500 }
    );
  }
}
