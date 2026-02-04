import { NextRequest, NextResponse } from 'next/server';

// Temporary in-memory store for debugging (will be lost on redeploy)
let allWebhooks: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔔 RAW WEBHOOK RECEIVED:', JSON.stringify(body, null, 2));
    
    // Store raw body for debugging
    allWebhooks.push({
      received: new Date().toISOString(),
      raw: body,
    });

    // Try to parse various possible formats
    let message = body.message || body.text || body.payload || '';
    
    // If no message, try stringifying the entire body
    if (!message) {
      message = typeof body === 'string' ? body : JSON.stringify(body);
      console.log('📝 Using stringified body as message:', message);
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

    const transaction = {
      username,
      type,
      itemName,
      status,
      timestamp: new Date().toISOString(),
    };

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
  });
}
