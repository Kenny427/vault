import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'AI opportunity ranking has been disabled.' },
    { status: 410 }
  );
}
