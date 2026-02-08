/**
 * AI-powered item extraction from game updates
 * Uses GPT-4o mini to identify items affected by updates
 */

import OpenAI from 'openai';
import type { AIExtractionResult } from '@/lib/types/gameUpdates';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract items and impacts from update content using AI
 */
export async function extractItemsFromUpdate(
  title: string,
  content: string
): Promise<AIExtractionResult> {
  try {
    console.log(`🤖 Analyzing update: "${title.slice(0, 50)}..."`);

    const prompt = `You are an OSRS (Old School RuneScape) game economy analyst. Analyze this game update and identify ALL items that will be affected.

UPDATE TITLE: ${title}

UPDATE CONTENT:
${content.slice(0, 8000)} ${content.length > 8000 ? '...(truncated)' : ''}

TASK: Extract all OSRS tradeable items mentioned or affected by this update.

For each item, determine:
1. **name**: Exact OSRS item name
2. **relationship**: How it's affected (requirement/reward/buff/nerf/drop_rate_change/other)
3. **quantity**: If a specific amount is mentioned
4. **confidence**: 0-100 (how sure you are this item is affected)
5. **notes**: Brief explanation

Also provide:
- **overall_sentiment**: bullish/bearish/neutral/mixed (market direction)
- **impact_level**: low/medium/high (how much it affects the economy)
- **category**: quest/combat/skilling/economy/pvp/other

IMPORTANT RULES:
- Only include TRADEABLE items (not quest-only items)
- Include items indirectly affected (e.g., if Dragons buffed, Dragon bones will rise)
- Be conservative with confidence scores
- Consider supply AND demand impacts
- Think about secondary effects

Return ONLY valid JSON, no explanation:

{
  "items": [
    {
      "name": "Dragon bones",
      "relationship": "requirement",
      "quantity": 100,
      "confidence": 85,
      "notes": "Required for new quest"
    }
  ],
  "overall_sentiment": "bullish",
  "impact_level": "medium",
  "category": "quest"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert OSRS economy analyst. Return only valid JSON responses.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent extraction
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) {
      throw new Error('No response from AI');
    }

    const result: AIExtractionResult = JSON.parse(resultText);

    // Validate and clean the response
    result.items = (result.items || []).filter(item => 
      item.name && 
      item.relationship && 
      item.confidence >= 30 // Min confidence threshold
    );

    console.log(`✅ Extracted ${result.items.length} items, sentiment: ${result.overall_sentiment}, impact: ${result.impact_level}`);

    return result;
  } catch (error) {
    console.error('Error extracting items:', error);
    
    // Return empty result on error
    return {
      items: [],
      overall_sentiment: 'neutral',
      impact_level: 'low',
    };
  }
}

/**
 * Match extracted item names to database item IDs
 */
export async function matchItemToDatabase(
  itemName: string
): Promise<{ id: number; name: string } | null> {
  try {
    // Fetch OSRS item mapping
    const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping');
    const mapping: Array<{ id: number; name: string }> = await response.json();

    // Normalize the search name
    const searchName = itemName.toLowerCase().trim();

    // Try exact match first
    let match = mapping.find(item => 
      item.name.toLowerCase() === searchName
    );

    if (match) return match;

    // Try partial match
    match = mapping.find(item => 
      item.name.toLowerCase().includes(searchName) ||
      searchName.includes(item.name.toLowerCase())
    );

    if (match) return match;

    // Try without common suffixes
    const withoutSuffix = searchName.replace(/\s+(noted|noted\)|\(|pack|set).*$/i, '');
    match = mapping.find(item => 
      item.name.toLowerCase().includes(withoutSuffix)
    );

    return match || null;
  } catch (error) {
    console.error(`Error matching item "${itemName}":`, error);
    return null;
  }
}

/**
 * Convert AI relationship to database impact type
 */
export function mapRelationshipToImpactType(
  relationship: string
): 'requirement' | 'reward' | 'buff' | 'nerf' | 'drop_rate_increase' | 'drop_rate_decrease' | 'new_method' | 'related' {
  const mapping: Record<string, any> = {
    requirement: 'requirement',
    reward: 'reward',
    buff: 'buff',
    nerf: 'nerf',
    drop_rate_change: 'related',
    drop_increase: 'drop_rate_increase',
    drop_decrease: 'drop_rate_decrease',
    new_method: 'new_method',
    other: 'related',
  };

  return mapping[relationship] || 'related';
}

/**
 * Determine sentiment from relationship
 */
export function determineSentiment(
  relationship: string,
  notes?: string
): 'bullish' | 'bearish' | 'neutral' {
  const bullishTerms = ['requirement', 'buff', 'demand', 'increase', 'rare'];
  const bearishTerms = ['nerf', 'drop_increase', 'supply', 'easier', 'common'];

  const text = `${relationship} ${notes || ''}`.toLowerCase();

  const bullishCount = bullishTerms.filter(term => text.includes(term)).length;
  const bearishCount = bearishTerms.filter(term => text.includes(term)).length;

  if (bullishCount > bearishCount) return 'bullish';
  if (bearishCount > bullishCount) return 'bearish';
  return 'neutral';
}
