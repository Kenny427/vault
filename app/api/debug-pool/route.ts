import { NextResponse } from 'next/server';
import { getPopularItems, getItemPrice, getItemHistory } from '@/lib/api/osrs';

export async function GET() {
  try {
    const items = await getPopularItems();
    
    const analysis = await Promise.all(
      items.slice(0, 20).map(async (item) => {
        try {
          const price = await getItemPrice(item.id);
          const currentPrice = price ? (price.high + price.low) / 2 : null;
          const history30 = await getItemHistory(item.id, 30 * 24 * 60 * 60, currentPrice || undefined);
          
          // Check if history is simulated (all prices very close to current)
          const isSimulated = history30 && history30.length > 0
            ? Math.max(...history30.map(p => Math.abs(p.price - (currentPrice || 0)) / (currentPrice || 1))) < 0.15
            : false;
          
          return {
            name: item.name,
            id: item.id,
            currentPrice,
            hasHistory: history30 && history30.length > 0,
            historyPoints: history30?.length ?? 0,
            isSimulated,
            priceRange: history30 ? {
              min: Math.min(...history30.map(p => p.price)),
              max: Math.max(...history30.map(p => p.price)),
            } : null,
          };
        } catch (e) {
          return {
            name: item.name,
            id: item.id,
            error: String(e),
          };
        }
      })
    );
    
    return NextResponse.json({
      totalPoolSize: items.length,
      sampleAnalysis: analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Debug failed' },
      { status: 500 }
    );
  }
}
