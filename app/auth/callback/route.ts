import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const response = NextResponse.redirect(new URL('/', requestUrl.origin));
    // The code will be exchanged for a session on the client side
    // Just redirect to home and let the auth context pick it up
    return response;
  }

  // If no code, redirect to home
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
