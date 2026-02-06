import { NextResponse } from 'next/server';
import { EXPANDED_ITEM_POOL } from '@/lib/expandedItemPool';

/**
 * Test endpoint to verify database pool fetching
 * GET /api/test-pool
 */
export async function GET() {
    try {
        console.log('🧪 Testing database pool fetch...');

        const pool = EXPANDED_ITEM_POOL;

        console.log(`✅ Successfully fetched ${pool.length} items`);

        return NextResponse.json({
            success: true,
            itemCount: pool.length,
            sampleItems: pool.slice(0, 5).map(item => ({
                id: item.id,
                name: item.name,
                category: item.category,
                botLikelihood: item.botLikelihood
            }))
        });
    } catch (error) {
        console.error('❌ Test pool fetch failed:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
