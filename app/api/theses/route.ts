import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

type ThesisRow = {
  id: string;
  item_id: number;
  horizon: string | null;
  catalyst: string | null;
  entry_plan: unknown;
  exit_plan: unknown;
  invalidation: unknown;
  confidence: number | null;
  status: string | null;
  created_at: string;
};

type SignalRow = {
  id: string;
  engine: string;
  item_id: number;
  horizon: string | null;
  score: number | null;
  features: Record<string, unknown> | null;
  created_at: string;
};

type GeNameRow = {
  item_id: number;
  item_name: string | null;
  event_time: string;
};

const VALID_HORIZONS = new Set(['hours', 'days', 'weeks']);

function normalizeHorizon(horizon: unknown): string {
  if (typeof horizon !== 'string') return '';
  return horizon.trim().toLowerCase();
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    let thesisQuery = supabase
      .from('theses')
      .select('id,item_id,horizon,catalyst,entry_plan,exit_plan,invalidation,confidence,status,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!includeArchived) {
      thesisQuery = thesisQuery.neq('status', 'archived');
    }

    const { data: theses, error: thesisError } = await thesisQuery;

    if (thesisError) {
      console.error('Failed to fetch theses:', thesisError);
      return NextResponse.json({ error: 'Failed to fetch theses' }, { status: 500 });
    }

    const thesisRows = (theses || []) as ThesisRow[];
    const itemIds = [...new Set(thesisRows.map((thesis) => thesis.item_id))];

    const latestSignalByKey = new Map<string, SignalRow>();
    const latestSignalByItemId = new Map<number, SignalRow>();
    const latestItemNameByItemId = new Map<number, string>();

    if (itemIds.length > 0) {
      const [{ data: signals, error: signalsError }, { data: geNames, error: geNamesError }] = await Promise.all([
        supabase
          .from('signals')
          .select('id,engine,item_id,horizon,score,features,created_at')
          .eq('user_id', user.id)
          .in('item_id', itemIds)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('ge_events')
          .select('item_id,item_name,event_time')
          .eq('user_id', user.id)
          .in('item_id', itemIds)
          .not('item_name', 'is', null)
          .order('event_time', { ascending: false })
          .limit(500),
      ]);

      if (signalsError) {
        console.error('Failed to fetch linked signals:', signalsError);
        return NextResponse.json({ error: 'Failed to fetch theses' }, { status: 500 });
      }

      if (geNamesError) {
        console.error('Failed to fetch item names from ge_events:', geNamesError);
      }

      for (const signal of (signals || []) as SignalRow[]) {
        const key = `${signal.item_id}::${signal.horizon || ''}`;
        if (!latestSignalByKey.has(key)) {
          latestSignalByKey.set(key, signal);
        }
        if (!latestSignalByItemId.has(signal.item_id)) {
          latestSignalByItemId.set(signal.item_id, signal);
        }
      }

      for (const event of (geNames || []) as GeNameRow[]) {
        if (!latestItemNameByItemId.has(event.item_id) && event.item_name) {
          latestItemNameByItemId.set(event.item_id, event.item_name);
        }
      }
    }

    const payload = thesisRows.map((thesis) => {
      const linkedSignal = latestSignalByKey.get(`${thesis.item_id}::${thesis.horizon || ''}`)
        || latestSignalByItemId.get(thesis.item_id)
        || null;
      const featureItemName = linkedSignal?.features && typeof linkedSignal.features.itemName === 'string'
        ? linkedSignal.features.itemName
        : null;

      return {
        ...thesis,
        item_name: featureItemName || latestItemNameByItemId.get(thesis.item_id) || null,
        latest_signal: linkedSignal,
      };
    });

    return NextResponse.json({ theses: payload });
  } catch (error) {
    console.error('Theses GET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const itemId = Number(body?.item_id);
    const horizon = normalizeHorizon(body?.horizon);
    const catalyst = toStringOrNull(body?.catalyst);
    const confidence = Number(body?.confidence);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return NextResponse.json({ error: 'item_id must be a positive integer' }, { status: 400 });
    }

    if (!VALID_HORIZONS.has(horizon)) {
      return NextResponse.json({ error: "horizon must be one of 'hours', 'days', 'weeks'" }, { status: 400 });
    }

    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
      return NextResponse.json({ error: 'confidence must be between 0 and 100' }, { status: 400 });
    }

    const thesisInsert = {
      user_id: user.id,
      item_id: itemId,
      horizon,
      catalyst,
      entry_plan: body?.entry_plan ?? null,
      exit_plan: body?.exit_plan ?? null,
      invalidation: body?.invalidation ?? null,
      confidence: Math.round(confidence),
      status: 'watching',
    };

    const { data: thesis, error } = await supabase
      .from('theses')
      .insert(thesisInsert)
      .select('id,item_id,horizon,catalyst,entry_plan,exit_plan,invalidation,confidence,status,created_at')
      .single();

    if (error) {
      console.error('Failed to create thesis:', error);
      return NextResponse.json({ error: 'Failed to create thesis' }, { status: 500 });
    }

    return NextResponse.json({ thesis }, { status: 201 });
  } catch (error) {
    console.error('Theses POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
