import { NextRequest, NextResponse } from 'next/server';

// Temporary in-memory store for debugging (will be lost on redeploy)
const recentWebhooks: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔔 DINK Webhook received:', body);

    // Parse DINK webhook format: %USERNAME% %TYPE% %ITEM% %STATUS%
    // Expected payload: { message: "Kenny BUY Iron Ore COMPLETED", ... }
    const message = body.message || body.text || '';

    if (!message) {
      console.warn('⚠️ No message field found in webhook');
      return NextResponse.json(
        { error: 'Missing message field in webhook payload' },
        { status: 400 }
      );
    }

    console.log('📝 Parsing message:', message);

    // Parse the message
    const parts = message.trim().split(/\s+/);
    if (parts.length < 3) {
      console.warn('⚠️ Invalid message format:', parts);
      return NextResponse.json(
        { error: 'Invalid message format. Expected: USERNAME TYPE ITEM [STATUS]' },
        { status: 400 }
      );
    }

    const username = parts[0];
    const type = parts[1]?.toUpperCase();
    const status = parts[parts.length - 1]; // Last part is status
    const itemName = parts.slice(2, parts.length - 1).join(' '); // Everything between TYPE and STATUS

    if (!['BUY', 'SELL'].includes(type)) {
      console.warn('⚠️ Invalid type:', type);
      return NextResponse.json(
        { error: 'TYPE must be BUY or SELL' },
        { status: 400 }
      );
    }

    const transaction = {
      username,
      type,
      itemName,
      status,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Transaction parsed:', transaction);
    
    // Store in temporary memory for debugging
    recentWebhooks.push(transaction);
    console.log(`📦 Total webhooks received: ${recentWebhooks.length}`);

    return NextResponse.json(
      {
        success: true,
        transaction,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: String(error) },
      { status: 500 }
    );
  }
}

// Debug endpoint to check received webhooks
export async function GET() {
  return NextResponse.json({
    totalReceived: recentWebhooks.length,
    recentWebhooks: recentWebhooks.slice(-10),
  });
}
