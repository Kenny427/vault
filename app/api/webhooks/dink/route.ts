import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Parse DINK webhook format: %USERNAME% %TYPE% %ITEM% %STATUS%
    // Expected payload: { message: "Kenny BUY Iron Ore COMPLETED", ... }
    const message = body.message || body.text || '';

    if (!message) {
      return NextResponse.json(
        { error: 'Missing message field in webhook payload' },
        { status: 400 }
      );
    }

    // Parse the message
    const parts = message.trim().split(/\s+/);
    if (parts.length < 3) {
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
      return NextResponse.json(
        { error: 'TYPE must be BUY or SELL' },
        { status: 400 }
      );
    }

    // Store transaction in localStorage via client
    // Return success so DINK knows it was received
    return NextResponse.json(
      {
        success: true,
        transaction: {
          username,
          type,
          itemName,
          status,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
