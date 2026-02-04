import { NextResponse } from 'next/server';
import { getPopularItems } from '@/lib/api/osrs';

export async function GET() {
  try {
    const items = await getPopularItems();
    const itemList = items.map(item => ({
      id: item.id,
      name: item.name,
    }));
    
    return NextResponse.json({
      count: itemList.length,
      items: itemList,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch item pool' },
      { status: 500 }
    );
  }
}
