import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      itemId,
      itemName,
      feedbackType,
      reason,
      tags,
      confidence,
      aiConfidence,
      aiThesis,
      priceAtFeedback,
    } = body;

    // Validate required fields
    if (!itemId || !itemName || !feedbackType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store feedback in database
    const { data, error } = await supabase
      .from('ai_feedback')
      .insert({
        user_id: user.id,
        item_id: itemId,
        item_name: itemName,
        feedback_type: feedbackType,
        reason: reason || null,
        tags: tags && tags.length > 0 ? tags : null,
        user_confidence: confidence || 50,
        ai_confidence: aiConfidence || null,
        ai_thesis: aiThesis || null,
        price_at_feedback: priceAtFeedback || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving feedback:', error);
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get recent feedback for AI learning context
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const daysBack = parseInt(searchParams.get('days') || '7');

    // Get recent feedback
    const { data: feedback, error } = await supabase
      .from('ai_feedback')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching feedback:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    // Get summary statistics
    const { data: summary } = await supabase
      .from('ai_feedback_summary')
      .select('*');

    return NextResponse.json({ 
      feedback,
      summary: summary || [],
    });
  } catch (error) {
    console.error('Error in feedback GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
