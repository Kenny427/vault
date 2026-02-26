import { NextResponse, type NextRequest } from 'next/server';
import { getLatest } from '@/lib/market/osrsWiki';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';

function isAuthorized(req: NextRequest) {
  const expected = process.env.OSRS_WIKI_INGEST_SECRET;
  if (!expected) return false;

  const provided = req.headers.get('x-ingest-secret') ?? '';
  return provided.length > 0 && provided === expected;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const latest = await getLatest();
    const supabase = createServiceRoleSupabaseClient();

    const { data, error } = await supabase
      .from('osrs_wiki_latest_ingests')
      .insert({ payload: latest })
      .select('id,fetched_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ingest: data }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
