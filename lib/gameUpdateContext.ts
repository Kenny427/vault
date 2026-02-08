/**
 * Helper function to fetch and format game updates for AI analysis
 */

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import type { ItemUpdateHistory } from '@/lib/types/gameUpdates';

export interface FormattedGameContext {
  hasUpdates: boolean;
  contextText: string;
  updates: ItemUpdateHistory[];
}

/**
 * Fetch recent game updates for an item and format them for AI prompts
 */
export async function getGameUpdateContext(
  itemId: number,
  daysBack: number = 14
): Promise<FormattedGameContext> {
  try {
    const supabase = createServerSupabaseClient();

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Get updates related to this item
    const { data: impacts, error } = await supabase
      .from('item_update_history')
      .select('*')
      .eq('item_id', itemId)
      .gte('update_date', cutoffDate.toISOString())
      .order('update_date', { ascending: false })
      .limit(10);

    if (error || !impacts || impacts.length === 0) {
      return {
        hasUpdates: false,
        contextText: '',
        updates: [],
      };
    }

    // Format updates for AI prompt
    const contextLines = [
      `\n🎮 RECENT GAME UPDATES (Last ${daysBack} days):`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ];

    for (const update of impacts) {
      const date = new Date(update.update_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      const releaseInfo = update.release_date
        ? ` (Release: ${new Date(update.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
        : '';

      const impactEmoji = 
        update.sentiment === 'bullish' ? '📈' :
        update.sentiment === 'bearish' ? '📉' : 
        '➡️';

      const impactText = 
        update.impact_type === 'requirement' ? 'Required for' :
        update.impact_type === 'reward' ? 'Rewarded by' :
        update.impact_type === 'buff' ? 'Buffed by' :
        update.impact_type === 'nerf' ? 'Nerfed by' :
        update.impact_type === 'drop_rate_increase' ? 'Drop rate increased' :
        update.impact_type === 'drop_rate_decrease' ? 'Drop rate decreased' :
        'Related to';

      contextLines.push(`\n[${date}${releaseInfo}] ${update.source_type.toUpperCase()}: "${update.title}"`);
      contextLines.push(`${impactEmoji} Impact: ${impactText} (${update.confidence}% confidence)`);
      
      if (update.quantity) {
        contextLines.push(`   Quantity mentioned: ${update.quantity}`);
      }

      if (update.notes) {
        contextLines.push(`   Details: ${update.notes}`);
      }

      contextLines.push(`   Impact Level: ${update.impact_level.toUpperCase()}`);
      contextLines.push('   ---');
    }

    contextLines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const contextText = contextLines.join('\n');

    return {
      hasUpdates: true,
      contextText,
      updates: impacts as ItemUpdateHistory[],
    };

  } catch (error) {
    console.error('Error fetching game update context:', error);
    return {
      hasUpdates: false,
      contextText: '',
      updates: [],
    };
  }
}

/**
 * Generate analysis guidance based on game updates
 */
export function generateUpdateGuidance(updates: ItemUpdateHistory[]): string {
  if (updates.length === 0) return '';

  const bullishUpdates = updates.filter(u => u.sentiment === 'bullish');
  const bearishUpdates = updates.filter(u => u.sentiment === 'bearish');
  const highImpact = updates.filter(u => u.impact_level === 'high');
  const upcomingReleases = updates.filter(u => 
    u.release_date && new Date(u.release_date) > new Date()
  );

  const guidelines = [];

  if (bullishUpdates.length > bearishUpdates.length) {
    guidelines.push('**GAME UPDATE SIGNAL**: Recent updates are predominantly BULLISH for this item.');
  } else if (bearishUpdates.length > bullishUpdates.length) {
    guidelines.push('**GAME UPDATE SIGNAL**: Recent updates are predominantly BEARISH for this item.');
  }

  if (highImpact.length > 0) {
    guidelines.push(`**HIGH IMPACT ALERTS**: ${highImpact.length} high-impact update(s) detected.`);
  }

  if (upcomingReleases.length > 0) {
    const nextRelease = upcomingReleases[0];
    const daysUntil = Math.ceil(
      (new Date(nextRelease.release_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    guidelines.push(`**UPCOMING RELEASE**: "${nextRelease.title}" in ${daysUntil} days - anticipate market movement.`);
  }

  if (guidelines.length > 0) {
    return '\n\n' + guidelines.join('\n') + '\n';
  }

  return '';
}
