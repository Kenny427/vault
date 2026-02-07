import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { fetchItemMapping, getItemHistoryWithVolumes } from '@/lib/api/osrs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

/**
 * Update buy limits and daily volumes for all pool items
 * This endpoint fetches data from OSRS Wiki API and updates the database
 */
export async function POST() {
    try {
        const authorized = await isAdmin();
        if (!authorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const supabase = createServerSupabaseClient();
        
        // Get all pool items
        const { data: poolItems, error: fetchError } = await supabase
            .from('custom_pool_items')
            .select('item_id, item_name')
            .eq('enabled', true);

        if (fetchError) {
            throw fetchError;
        }

        if (!poolItems || poolItems.length === 0) {
            return NextResponse.json({ 
                message: 'No enabled items in pool',
                updated: 0 
            });
        }

        // Fetch mapping data with buy limits
        const mapping = await fetchItemMapping();
        const mappingMap = new Map(mapping.map(item => [item.id, item]));

        let updated = 0;
        let errors = 0;
        const updates: { itemId: number; buyLimit: number | null; volume: number | null }[] = [];

        // Process items in batches to avoid overwhelming the API
        const batchSize = 10;
        for (let i = 0; i < poolItems.length; i += batchSize) {
            const batch = poolItems.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (item) => {
                try {
                    const itemInfo = mappingMap.get(item.item_id);
                    const buyLimit = itemInfo?.limit || null;

                    // Fetch volume data (last 24 hours)
                    let dailyVolume: number | null = null;
                    try {
                        const priceData = await getItemHistoryWithVolumes(item.item_id, 24 * 60 * 60);
                        if (priceData && priceData.length > 0) {
                            // Calculate average daily volume from recent data
                            const recentData = priceData.slice(-7); // Last 7 days
                            const totalVolume = recentData.reduce((sum, d) => {
                                const vol = (d.highPriceVolume || 0) + (d.lowPriceVolume || 0);
                                return sum + vol;
                            }, 0);
                            dailyVolume = Math.floor(totalVolume / recentData.length);
                        }
                    } catch (volumeError) {
                        console.warn(`Failed to fetch volume for ${item.item_name}:`, volumeError);
                    }

                    updates.push({
                        itemId: item.item_id,
                        buyLimit,
                        volume: dailyVolume
                    });
                } catch (error) {
                    console.error(`Error processing item ${item.item_id}:`, error);
                    errors++;
                }
            }));

            // Small delay between batches to be nice to the API
            if (i + batchSize < poolItems.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        // Update database with all collected data
        for (const update of updates) {
            const { error: updateError } = await supabase
                .from('custom_pool_items')
                .update({
                    buy_limit: update.buyLimit,
                    daily_volume: update.volume,
                    last_volume_update: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('item_id', update.itemId);

            if (updateError) {
                console.error(`Failed to update item ${update.itemId}:`, updateError);
                errors++;
            } else {
                updated++;
            }
        }

        return NextResponse.json({
            message: 'Volume and buy limit update complete',
            total: poolItems.length,
            updated,
            errors,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating volumes:', error);
        return NextResponse.json({ 
            error: 'Failed to update volumes', 
            details: String(error) 
        }, { status: 500 });
    }
}
