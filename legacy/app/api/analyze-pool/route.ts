import { NextRequest, NextResponse } from 'next/server';
import { analyzePoolWithAI } from '@/lib/aiAnalysis';

export async function POST(request: NextRequest) {
  try {
    const items = await request.json();

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Invalid request: expected array of item names' },
        { status: 400 }
      );
    }

    const normalized = items
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 200);

    const review = await analyzePoolWithAI(normalized);
    return NextResponse.json(review);
  } catch (error: any) {
    console.error('Pool analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze pool' },
      { status: 500 }
    );
  }
}
