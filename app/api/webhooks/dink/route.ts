import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseAdmin';

type ParsedEvent = {
  rsn: string;
  side: 'buy' | 'sell';
  itemId: number | null;
  itemName: string | null;
  qty: number | null;
  priceEach: number | null;
  status: string;
  eventTime: string;
  sourceEventId: string;
};

const normalizeType = (status?: string): 'buy' | 'sell' | 'unknown' => {
  const normalized = (status || '').toUpperCase();
  if (normalized.includes('BOUGHT') || normalized.includes('BUY')) return 'buy';
  if (normalized.includes('SOLD') || normalized.includes('SELL')) return 'sell';
  return 'unknown';
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `evt_${Math.abs(hash)}`;
};

const toInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
};

const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`;
};

const parseRequestBody = async (request: NextRequest): Promise<{ body: any; rawText: string }> => {
  const contentType = request.headers.get('content-type') || '';
  let body: any = null;
  let rawText = '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const payloadJson = formData.get('payload_json');
    if (typeof payloadJson === 'string') {
      rawText = payloadJson;
      body = JSON.parse(payloadJson);
    } else {
      body = Object.fromEntries(formData.entries());
      rawText = JSON.stringify(body);
    }
    return { body, rawText };
  }

  rawText = await request.text();
  try {
    body = JSON.parse(rawText);
  } catch {
    body = rawText;
  }

  return { body, rawText };
};

const parseFromPayloadJson = (payload: any, rawText: string): ParsedEvent | null => {
  if (!payload || payload.type !== 'GRAND_EXCHANGE') return null;

  const item = payload.extra?.item;
  if (!item?.name) return null;

  const status = payload.extra?.status || payload.content || 'UNKNOWN';
  const side = normalizeType(status);
  if (side === 'unknown') return null;

  const rsn = (payload.playerName || payload.username || 'Unknown').toString();

  const sourceEventId =
    payload.source_event_id ||
    payload.sourceEventId ||
    payload.event_id ||
    payload.eventId ||
    payload.extra?.event_id ||
    payload.extra?.eventId ||
    hashString(stableStringify(payload) || rawText);

  const eventTime =
    payload.event_time ||
    payload.eventTime ||
    payload.timestamp ||
    new Date().toISOString();

  return {
    rsn,
    side,
    itemId: toInt(item.id),
    itemName: item.name ? String(item.name) : null,
    qty: toInt(item.quantity),
    priceEach: toInt(item.priceEach),
    status: String(status),
    eventTime: new Date(eventTime).toISOString(),
    sourceEventId: String(sourceEventId),
  };
};

const parseFromMessage = (body: any, rawText: string): ParsedEvent | null => {
  let message = body?.message || body?.text || body?.payload || '';
  if (!message) message = typeof body === 'string' ? body : rawText;
  if (!message || typeof message !== 'string') return null;

  const parts = message.trim().split(/\s+/);
  if (parts.length < 3) return null;

  const rsn = parts[0];
  const type = parts[1]?.toUpperCase();
  const status = parts[parts.length - 1] || type;
  const side = normalizeType(type || status);
  if (side === 'unknown') return null;

  const itemName = parts.slice(2, parts.length - 1).join(' ') || parts.slice(2).join(' ');
  const sourceEventId = hashString(`${rsn}|${type}|${itemName}|${status}`);

  return {
    rsn,
    side,
    itemId: null,
    itemName: itemName || null,
    qty: null,
    priceEach: null,
    status,
    eventTime: new Date().toISOString(),
    sourceEventId,
  };
};

export async function POST(request: NextRequest) {
  try {
    const { body, rawText } = await parseRequestBody(request);

    const parsedEvent = parseFromPayloadJson(body, rawText) || parseFromMessage(body, rawText);
    if (!parsedEvent) {
      return NextResponse.json({
        success: false,
        message: 'Unsupported webhook format',
      }, { status: 200 });
    }

    const supabase = createServerSupabaseClient();
    const adminSupabase = createAdminSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let targetUserIds: string[] = [];

    if (user?.id) {
      targetUserIds = [user.id];
    } else {
      const { data: rsnUsers, error: rsnError } = await adminSupabase
        .from('user_rsn_accounts')
        .select('user_id')
        .ilike('rsn', parsedEvent.rsn);

      if (rsnError) {
        console.error('Error resolving RSN user mapping:', rsnError);
      }

      targetUserIds = [...new Set((rsnUsers || []).map((row: any) => row.user_id).filter(Boolean))];
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No mapped user found for RSN',
      }, { status: 200 });
    }

    const rows = targetUserIds.map((userId) => ({
      user_id: userId,
      rsn: parsedEvent.rsn,
      source: 'dink',
      source_event_id: `${parsedEvent.sourceEventId}:${userId}`,
      event_time: parsedEvent.eventTime,
      side: parsedEvent.side,
      item_id: parsedEvent.itemId,
      item_name: parsedEvent.itemName,
      qty: parsedEvent.qty,
      price_each: parsedEvent.priceEach,
      raw_json: typeof body === 'string' ? { raw: body } : body,
    }));

    const { data: insertedRows, error: insertError } = await adminSupabase
      .from('ge_events')
      .upsert(rows, {
        onConflict: 'source,source_event_id',
        ignoreDuplicates: true,
      })
      .select('id,user_id,source_event_id,event_time,rsn,side,item_id,item_name,qty,price_each');

    if (insertError) {
      console.error('Failed to persist ge_events:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Failed to persist event',
      }, { status: 500 });
    }

    const first = insertedRows?.[0];

    return NextResponse.json({
      success: true,
      transaction: {
        id: first?.id || `${parsedEvent.sourceEventId}:${targetUserIds[0]}`,
        username: parsedEvent.rsn,
        type: parsedEvent.side.toUpperCase(),
        itemName: parsedEvent.itemName,
        status: parsedEvent.status,
        timestamp: new Date(parsedEvent.eventTime).getTime(),
        quantity: parsedEvent.qty,
        price: parsedEvent.priceEach,
        itemId: parsedEvent.itemId,
      },
      persistedCount: insertedRows?.length || 0,
    }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process webhook',
      details: String(error),
    }, { status: 200 });
  }
}

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
    const rsn = searchParams.get('rsn');

    let query = supabase
      .from('ge_events')
      .select('id,rsn,event_time,side,item_id,item_name,qty,price_each,source_event_id,raw_json,created_at')
      .eq('user_id', user.id)
      .order('event_time', { ascending: false })
      .limit(200);

    if (rsn) {
      query = query.eq('rsn', rsn);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Failed to fetch ge_events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    const parsedTransactions = (events || []).map((event: any) => ({
      id: event.id,
      username: event.rsn || 'Unknown',
      type: event.side === 'buy' ? 'BUY' : 'SELL',
      itemName: event.item_name,
      status: event.side,
      quantity: event.qty,
      price: event.price_each,
      itemId: event.item_id,
      timestamp: new Date(event.event_time).getTime(),
      sourceEventId: event.source_event_id,
      raw: event.raw_json,
    }));

    return NextResponse.json({
      totalReceived: parsedTransactions.length,
      recentWebhooks: [],
      parsedTransactions,
    });
  } catch (error) {
    console.error('Webhook GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
