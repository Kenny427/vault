import { NextResponse } from 'next/server';
import { trackEvent, getAnalyticsOverview } from '@/lib/adminAnalytics';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

/**
 * Test endpoint for analytics tracking
 * GET - View recent analytics summary
 * POST - Create a test analytics event
 */
export async function GET() {
    try {
        const overview = await getAnalyticsOverview(7);
        return NextResponse.json({ success: true, overview });
    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}

export async function POST() {
    try {
        const supabase = createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        await trackEvent({
            userId: user?.id,
            eventType: 'test_event',
            metadata: { 
                test: true,
                timestamp: new Date().toISOString() 
            },
            costUsd: 0.001,
            tokensUsed: 100
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Test analytics event tracked successfully' 
        });
    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}
