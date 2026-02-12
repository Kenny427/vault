import { NextRequest, NextResponse } from 'next/server';

// Temporary in-memory store for debugging (will be lost on redeploy)
let allWebhooks: any[] = [];
let parsedTransactions: any[] = [];
let seenTransactionIds = new Set<string>();
let lastSeenBySignature = new Map<string, number>();

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `tx_${Math.abs(hash)}`;
};

const createTransactionId = (signature: string, bucket: number) => hashString(`${signature}|${bucket}`);

const normalizeType = (status?: string) => {
  const normalized = (status || '').toUpperCase();
  if (normalized.includes('BOUGHT') || normalized.includes('BUY')) return 'BUY';
  if (normalized.includes('SOLD') || normalized.includes('SELL')) return 'SELL';
  return 'UNKNOWN';
};

const shouldAcceptSignature = (signature: string, now: number) => {
  const lastSeen = lastSeenBySignature.get(signature);
  if (!lastSeen || now - lastSeen > 2000) {
    lastSeenBySignature.set(signature, now);
    return true;
  }
  return false;
};

const parseFromPayloadJson = (payload: any) => {
  if (!payload || payload.type !== 'GRAND_EXCHANGE') return null;

  const item = payload.extra?.item;
  if (!item?.name) return null;

  const status = payload.extra?.status || payload.content || 'UNKNOWN';
  const now = Date.now();
  const signature = [
    payload.playerName || 'unknown',
    payload.world || 'unknown',
    payload.regionId || 'unknown',
    status,
    item.id,
    item.name,
    item.quantity,
    item.priceEach,
    payload.extra?.slot ?? 'unknown',
    payload.extra?.targetQuantity ?? 'unknown',
    payload.extra?.targetPrice ?? 'unknown',
    payload.extra?.marketPrice ?? 'unknown',
  ].join('|');

  if (!shouldAcceptSignature(signature, now)) return null;

  const bucket = Math.floor(now / 2000);
  return {
    id: createTransactionId(signature, bucket),
    username: payload.playerName || 'Unknown',
    type: normalizeType(status),
    itemName: item.name,
    status: status,
    quantity: item.quantity,
    price: item.priceEach,
    itemId: item.id,
    timestamp: now,
  };
};

export async function POST(request: NextRequest) {
  try {
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
        rawText = JSON.stringify(Object.fromEntries(formData.entries()));
        body = Object.fromEntries(formData.entries());
      }
    } else {
      rawText = await request.text();
      try {
        body = JSON.parse(rawText);
      } catch {
        body = rawText;
      }
    }

    console.log('🔔 RAW WEBHOOK RECEIVED:', typeof body === 'string' ? body : JSON.stringify(body, null, 2));

    // Store raw body for debugging
    allWebhooks.push({
      received: new Date().toISOString(),
      raw: body,
    });

    // Parse using DINK payload_json when available
    const payloadTransaction = parseFromPayloadJson(body);
    if (payloadTransaction) {
      if (!seenTransactionIds.has(payloadTransaction.id)) {
        parsedTransactions.push(payloadTransaction);
        seenTransactionIds.add(payloadTransaction.id);
      }
      allWebhooks.push({ received: new Date().toISOString(), parsed: payloadTransaction });

      return NextResponse.json(
        { success: true, transaction: payloadTransaction },
        { status: 200 }
      );
    }

    // Try to parse various possible formats
    let message = (body && body.message) || (body && body.text) || (body && body.payload) || '';

    // If no message, use raw text as message
    if (!message) {
      message = typeof body === 'string' ? body : rawText;
      console.log('📝 Using raw text as message:', message);
    }

    console.log('📝 Parsed message:', message);

    // Parse the message: USERNAME TYPE ITEM [STATUS]
    const parts = message.trim().split(/\s+/);
    
    if (parts.length < 3) {
      console.warn('⚠️ Not enough parts:', parts);
      return NextResponse.json(
        { 
          success: false,
          message: 'Need at least 3 parts: USERNAME TYPE ITEM',
          parts,
        },
        { status: 200 } // Return 200 so DINK knows we got it
      );
    }

    const username = parts[0];
    const type = parts[1]?.toUpperCase();
    const status = parts[parts.length - 1];
    const itemName = parts.slice(2, parts.length - 1).join(' ');

    console.log('✅ Parsed:', { username, type, itemName, status });

    if (!['BUY', 'SELL'].includes(type)) {
      console.warn('⚠️ Invalid type, storing anyway:', type);
    }

    const now = Date.now();
    const signature = [username, type, itemName, status].join('|');
    if (!shouldAcceptSignature(signature, now)) {
      return NextResponse.json(
        { success: true, transaction: null, skipped: true },
        { status: 200 }
      );
    }
    const bucket = Math.floor(now / 2000);
    const transaction = {
      id: createTransactionId(signature, bucket),
      username,
      type,
      itemName,
      status,
      timestamp: now,
    };

    if (!seenTransactionIds.has(transaction.id)) {
      parsedTransactions.push(transaction);
      seenTransactionIds.add(transaction.id);
    }

    // Store parsed transaction
    allWebhooks.push({
      received: new Date().toISOString(),
      parsed: transaction,
    });

    console.log(`📦 Total transactions: ${allWebhooks.length}`);

    return NextResponse.json(
      {
        success: true,
        transaction,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    allWebhooks.push({
      received: new Date().toISOString(),
      error: String(error),
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process webhook', 
        details: String(error),
      },
      { status: 200 } // Return 200 so DINK knows we got it
    );
  }
}

// Debug endpoint to see what DINK is sending
export async function GET() {
  return NextResponse.json({
    totalReceived: allWebhooks.length,
    recentWebhooks: allWebhooks.slice(-20),
    parsedTransactions: parsedTransactions.slice(-200),
  });
}
