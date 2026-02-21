import { NextResponse } from 'next/server';
import { getOpenRouterClient } from '@/lib/ai/openrouter';

const client = getOpenRouterClient();

export const runtime = 'nodejs';

// Simple in-memory cache with timestamp
let briefingCache: {
  content: string;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  try {
    // Check if we have a recent cached briefing
    const now = Date.now();
    if (briefingCache && now - briefingCache.timestamp < CACHE_DURATION) {
      console.log(`📰 Returning cached daily briefing (age: ${Math.round((now - briefingCache.timestamp) / 1000 / 60)} minutes)`);
      return NextResponse.json({
        briefing: briefingCache.content,
        cached: true,
        timestamp: new Date(briefingCache.timestamp).toISOString(),
      });
    }

    // Fetch current opportunities to analyze
    const oppRes = await fetch('http://localhost:3000/api/mean-reversion-opportunities');
    const oppData = await oppRes.json();

    if (!oppData.opportunities || oppData.opportunities.length === 0) {
      return NextResponse.json({
        briefing: 'No opportunities found to brief on today.',
        cached: false,
        timestamp: new Date().toISOString(),
      });
    }

    // Get top 5 opportunities by confidence score
    const top5 = oppData.opportunities
      .sort((a: any, b: any) => b.confidenceScore - a.confidenceScore)
      .slice(0, 5)
      .map((opp: any) => `${opp.itemName} (ID:${opp.itemId}): ${opp.currentPrice}gp, ${opp.reversionPotential.toFixed(1)}% potential, confidence ${opp.confidenceScore}%`);

    const prompt = `Generate a brief 150-200 word market briefing for an OSRS Grand Exchange trader. Focus on the top 5 current opportunities and broader market trends.

Top 5 Opportunities today:
${top5.join('\n')}

Provide:
1. Market overview (general conditions, what's trending)
2. Summary of top opportunities
3. Trading strategy suggestion for today
4. Key risks to watch

Be concise, actionable, and focus on what a trader should do TODAY.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const briefing = response.choices[0]?.message.content || 'Unable to generate briefing.';
    
    // Log token usage
    const usage = response.usage;
    if (usage) {
      const inputCost = (usage.prompt_tokens / 1000) * 0.00015;
      const outputCost = (usage.completion_tokens / 1000) * 0.0006;
      const totalCost = inputCost + outputCost;
      const totalTokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
      console.log(`💰 Daily briefing: ${usage.prompt_tokens} in + ${usage.completion_tokens} out = ${totalTokens} tokens | Cost: $${totalCost.toFixed(4)}`);
    }

    // Cache the result
    briefingCache = {
      content: briefing,
      timestamp: now,
    };

    return NextResponse.json({
      briefing,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error generating daily briefing:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate briefing',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
