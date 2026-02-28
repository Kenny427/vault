import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Opportunity } from '@/app/api/opportunities/route';

type AIBrief = {
  regime: string;
  summary: string;
  focusItems: Array<{ item_name: string; reason: string }>;
  riskFlags: string[];
};

const MODEL = 'openai/gpt-4o-mini';

function fallbackBrief(opportunities: Opportunity[]): AIBrief {
  const top = opportunities.slice(0, 3);
  return {
    regime: 'Data-only mode (AI unavailable)',
    summary: `Top spread opportunities: ${top.map((o) => o.item_name).join(', ') || 'none'}. Enable OPENROUTER_API_KEY for AI trade context.`,
    focusItems: top.map((o) => ({
      item_name: o.item_name,
      reason: `${o.spread_pct.toFixed(1)}% spread with est. ${o.est_profit.toLocaleString()} gp profit per cycle.`,
    })),
    riskFlags: ['AI not configured, only quantitative scoring is being used.'],
  };
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as { opportunities?: Opportunity[] };
  const opportunities = (body.opportunities ?? []).slice(0, 20);

  if (opportunities.length === 0) {
    return NextResponse.json({ error: 'No opportunities supplied' }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ brief: fallbackBrief(opportunities), fallback: true });
  }

  const prompt = `You are an elite Old School RuneScape flipping analyst.
Return STRICT JSON with shape:
{
  "regime": "string",
  "summary": "string max 360 chars",
  "focusItems": [{"item_name": "string", "reason": "string max 130 chars"}],
  "riskFlags": ["string"]
}

Context opportunities:
${JSON.stringify(
  opportunities.map((o) => ({
    item_name: o.item_name,
    spread_pct: o.spread_pct,
    est_profit: o.est_profit,
    score: o.score,
    volume_1h: o.volume_1h,
    margin: o.margin,
  })),
)}

Instructions:
- prioritize setups likely caused by temporary dumping/oversupply where 1-8 week mean reversion is possible
- include 3-5 focusItems
- keep concise and actionable`;

  const response = await fetch('https://openrouter.io/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://vault.local',
      'X-Title': 'Vault OSRS',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a practical OSRS market analyst and must respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.25,
      max_tokens: 700,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: `OpenRouter error: ${errorText.slice(0, 200)}` }, { status: 500 });
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: 'No AI response content' }, { status: 500 });
  }

  try {
    const parsed = JSON.parse(content) as AIBrief;
    return NextResponse.json({
      brief: {
        regime: parsed.regime ?? 'Mixed',
        summary: parsed.summary ?? 'No summary generated.',
        focusItems: Array.isArray(parsed.focusItems) ? parsed.focusItems.slice(0, 5) : [],
        riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags.slice(0, 5) : [],
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response JSON' }, { status: 500 });
  }
}
