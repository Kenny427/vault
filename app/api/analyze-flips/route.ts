import { NextResponse } from 'next/server';
import { analyzeFlipsWithAI, clearAnalysisCache } from '@/lib/aiAnalysis';

export async function POST(request: Request) {
  try {
    const items = await request.json();
    
    // Clear cache on each request (manual refresh behavior)
    clearAnalysisCache();
    
    const opportunities = await analyzeFlipsWithAI(items);
    
    return NextResponse.json(opportunities);
  } catch (error: any) {
    console.error('AI analysis API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze opportunities' },
      { status: 500 }
    );
  }
}
