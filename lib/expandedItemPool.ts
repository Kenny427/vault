import { supabase } from '@/lib/supabase';

/**
 * DYNAMIC DATABASE-DRIVEN ITEM POOL
 * 
 * Items are now managed via the admin panel's Manual Pool Editor
 * This allows adding/removing items without code changes
 */

export interface ItemPoolEntry {
  id: number;
  name: string;
  category: string;
  priority: number;
  enabled: boolean;
  tags: string[];
  // Compatibility fields for mean-reversion analysis
  botLikelihood: 'very_high' | 'high' | 'medium';
  volumeTier: 'massive' | 'high' | 'medium';
  demandType: 'constant' | 'pvm' | 'skilling';
}

/**
 * Fetch enabled items from the database pool
 * Falls back to empty array if database is not populated yet
 */
export async function getDatabaseItemPool(): Promise<ItemPoolEntry[]> {
  try {
    const { data, error } = await supabase
      .from('custom_pool_items')
      .select('item_id, item_name, category, priority, enabled, tags')
      .eq('enabled', true)
      .order('priority', { ascending: false })
      .order('item_name', { ascending: true });

    if (error) {
      console.error('Error fetching database pool:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.item_id,
      name: item.item_name,
      category: item.category || 'Uncategorized',
      priority: item.priority || 0,
      enabled: item.enabled,
      tags: item.tags || [],
      // Add compatibility fields for mean-reversion analysis
      botLikelihood: (item.tags || []).includes('very_high_bot') ? 'very_high' as const :
        (item.tags || []).includes('high_bot') ? 'high' as const : 'medium' as const,
      volumeTier: (item.tags || []).includes('massive_volume') ? 'massive' as const :
        (item.tags || []).includes('high_volume') ? 'high' as const : 'medium' as const,
      demandType: (item.tags || []).includes('constant_demand') ? 'constant' as const :
        (item.tags || []).includes('pvm') ? 'pvm' as const : 'skilling' as const
    }));
  } catch (error) {
    console.error('Failed to fetch database pool:', error);
    return [];
  }
}

/**
 * Get all items for analysis (enabled items only)
 */
export async function getAllAnalysisItems() {
  const pool = await getDatabaseItemPool();
  return pool.map(item => ({
    id: item.id,
    name: item.name,
    // Extract bot likelihood from tags
    botLikelihood: item.tags.includes('very_high_bot') ? 'very_high' :
      item.tags.includes('high_bot') ? 'high' : 'medium',
    // Extract volume tier from tags
    volumeTier: item.tags.includes('massive_volume') ? 'massive' :
      item.tags.includes('high_volume') ? 'high' : 'medium'
  }));
}

/**
 * Get items by category
 */
export async function getItemsByCategory(category: string) {
  const pool = await getDatabaseItemPool();
  return pool.filter(item =>
    item.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get high volume items
 */
export async function getHighVolumeItems() {
  const pool = await getDatabaseItemPool();
  return pool.filter(item =>
    item.tags.includes('massive_volume') || item.tags.includes('high_volume')
  );
}

/**
 * Get botted items
 */
export async function getBottedItems() {
  const pool = await getDatabaseItemPool();
  return pool.filter(item =>
    item.tags.includes('very_high_bot') || item.tags.includes('high_bot')
  );
}

/**
 * Get items by demand type
 */
export async function getItemsByDemandType(demandType: string) {
  const pool = await getDatabaseItemPool();
  return pool.filter(item => item.tags.includes(demandType.toLowerCase()));
}

/**
 * Get items best suited for mean-reversion investment
 */
export async function getMeanReversionCandidates() {
  const pool = await getDatabaseItemPool();
  return pool.filter(item => {
    const isHighlyBotted = item.tags.includes('very_high_bot') || item.tags.includes('high_bot');
    const isHighVolume = item.tags.includes('massive_volume') || item.tags.includes('high_volume');
    const isGoodDemand = item.tags.includes('constant_demand') || item.tags.includes('pvm');

    return isHighlyBotted && isHighVolume && isGoodDemand;
  });
}
