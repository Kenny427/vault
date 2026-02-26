import { NextResponse } from 'next/server';
import { fetchItemMapping, getPopularItems } from '@/lib/api/osrs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get('mode') || 'popular').toLowerCase();
    const limitParam = Number(searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(50, limitParam), 5000) : 2000;

    let items = await getPopularItems();

    if (mode === 'expanded') {
      const mapping = await fetchItemMapping();
      const filtered = mapping.filter(item => {
        const hasValue = typeof item.value === 'number' && item.value > 0;
        const hasLimit = typeof item.limit === 'number' && item.limit > 0;
        return hasValue || hasLimit;
      });

      items = filtered.slice(0, limit);
    }

    const itemList = items.map(item => ({
      id: item.id,
      name: item.name,
    }));
    
    return NextResponse.json({
      count: itemList.length,
      items: itemList,
      mode,
      limit: mode === 'expanded' ? limit : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch item pool' },
      { status: 500 }
    );
  }
}
