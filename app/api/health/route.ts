import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerSupabaseClient();
  
  // Quick DB connectivity check
  const { data: healthCheck, error } = await supabase
    .from('items')
    .select('item_id')
    .limit(1)
    .maybeSingle();

  const dbOk = !error && healthCheck !== null;
  
  return NextResponse.json({
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    db: dbOk ? 'connected' : 'error',
    error: error?.message ?? null,
  });
}
