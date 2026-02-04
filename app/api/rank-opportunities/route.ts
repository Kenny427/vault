import { NextRequest, NextResponse } from 'next/server';
import { rankOpportunitiesWithAI } from '@/lib/aiAnalysis';

export async function POST(request: NextRequest) {
  try {
    const opportunities = await request.json();

    if (!Array.isArray(opportunities)) {
      return NextResponse.json(
        { error: 'Invalid request: expected array of opportunities' },
        { status: 400 }
      );
    }

    const ranked = await rankOpportunitiesWithAI(opportunities);

    return NextResponse.json(ranked);
  } catch (error: any) {
    console.error('Opportunity ranking error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rank opportunities' },
      { status: 500 }
    );
  }
}
