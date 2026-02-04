import { NextRequest, NextResponse } from 'next/server';
import { analyzePortfolioWithAI } from '@/lib/aiAnalysis';

export async function POST(request: NextRequest) {
  try {
    const portfolioItems = await request.json();

    if (!Array.isArray(portfolioItems)) {
      return NextResponse.json(
        { error: 'Invalid request: expected array of portfolio items' },
        { status: 400 }
      );
    }

    const review = await analyzePortfolioWithAI(portfolioItems);

    return NextResponse.json(review);
  } catch (error: any) {
    console.error('Portfolio analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze portfolio' },
      { status: 500 }
    );
  }
}
