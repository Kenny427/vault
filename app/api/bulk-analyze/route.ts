import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    if (items.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 items per batch' }, { status: 400 });
    }

    const itemsData = items.map((item: any) => ({
      name: item.itemName,
      price: item.currentPrice,
      avg30d: item.avg30d,
      avg90d: item.avg90d,
      volatility: item.volatility,
    }));

    const prompt = `You are an OSRS Grand Exchange trading expert. Analyze these ${items.length} items for flip opportunities:

${itemsData.map((item, idx) => `
${idx + 1}. ${item.name}
   - Current: ${item.price}gp
   - 30d avg: ${item.avg30d}gp
   - 90d avg: ${item.avg90d}gp
   - Volatility: ${item.volatility?.toFixed(1)}%
`).join('\n')}

For each item, provide:
1. 🎯 Quick verdict (Buy, Hold, or Avoid)
2. 📊 Key reason (1 sentence)
3. 💰 Estimated profit potential (Low/Medium/High)

Keep each analysis to 2-3 lines max. Be concise and actionable.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert OSRS trader. Provide brief, actionable flip recommendations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const analysis = completion.choices[0].message.content;

    return NextResponse.json({
      analysis,
      itemCount: items.length,
      cost: 'approximately $0.01-0.02 per batch',
    });
  } catch (error) {
    console.error('Bulk analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze items' },
      { status: 500 }
    );
  }
}
