import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

// GET: Retrieve cached Alpha Feed
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get latest cached feed
    const { data: cachedFeed, error: cacheError } = await supabase
      .rpc('get_latest_cached_alpha_feed')
      .single();

    if (cacheError) {
      console.error('Error fetching cached feed:', cacheError);
      return NextResponse.json({ cached: null, canRescan: true });
    }

    // Get username of scanner
    let scannedByUsername = 'Unknown';
    if (cachedFeed && (cachedFeed as any).scanned_by_user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('id', (cachedFeed as any).scanned_by_user_id)
        .single();
      
      scannedByUsername = profile?.username || profile?.email?.split('@')[0] || 'Unknown';
    }

    return NextResponse.json({
      cached: cachedFeed ? {
        opportunities: (cachedFeed as any).opportunities,
        filteredStage0: (cachedFeed as any).filtered_stage0,
        aiRejected: (cachedFeed as any).ai_rejected,
        scannedBy: scannedByUsername,
        scannedAt: (cachedFeed as any).scanned_at,
        expiresAt: (cachedFeed as any).expires_at,
        isExpired: (cachedFeed as any).is_expired,
        minutesUntilRescan: (cachedFeed as any).minutes_until_rescan,
        totalOpportunities: (cachedFeed as any).total_opportunities,
        totalRejected: (cachedFeed as any).total_rejected,
      } : null,
      canRescan: cachedFeed ? (cachedFeed as any).is_expired !== false : true,
    });
  } catch (error) {
    console.error('Error in cached feed API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Save new Alpha Feed analysis
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if rescan is allowed
    const { data: canRescan } = await supabase.rpc('can_rescan_alpha_feed');

    if (!canRescan) {
      return NextResponse.json(
        { error: 'Cooldown active. Please wait before rescanning.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      opportunities,
      filteredStage0,
      aiRejected,
      analysisDuration,
      aiCost,
    } = body;

    // Save to cache
    const { data: newCache, error: insertError } = await supabase
      .from('cached_alpha_feed')
      .insert({
        opportunities,
        filtered_stage0: filteredStage0,
        ai_rejected: aiRejected,
        scanned_by_user_id: user.id,
        total_opportunities: opportunities?.length || 0,
        total_rejected: (filteredStage0?.length || 0) + (aiRejected?.length || 0),
        analysis_duration_seconds: analysisDuration,
        ai_cost_dollars: aiCost,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving cached feed:', insertError);
      return NextResponse.json({ error: 'Failed to cache feed' }, { status: 500 });
    }

    // Cleanup old entries
    await supabase.rpc('cleanup_old_alpha_feed_cache');

    return NextResponse.json({
      success: true,
      cacheId: newCache.id,
      expiresAt: newCache.expires_at,
    });
  } catch (error) {
    console.error('Error in cached feed save:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
