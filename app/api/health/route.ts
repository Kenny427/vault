import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseAdmin();

  const checks: Record<string, { ok: boolean; message: string }> = {};

  // Check Supabase connection
  try {
    const { error } = await supabase.from('items').select('count').limit(1);
    if (error) throw error;
    checks.supabase = { ok: true, message: 'Connected' };
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : (err as any)?.message || (err as any)?.error_description || JSON.stringify(err);
    checks.supabase = { ok: false, message: msg || 'Connection failed' };
  }

  // Check OSRS Wiki API reachability (cheap HEAD)
  try {
    const res = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping', {
      method: 'HEAD',
      next: { revalidate: 60 },
    });
    checks.osrs_wiki = {
      ok: res.ok,
      message: res.ok ? 'API reachable' : `HTTP ${res.status}`,
    };
  } catch (err) {
    checks.osrs_wiki = {
      ok: false,
      message: err instanceof Error ? err.message : 'Fetch failed',
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
