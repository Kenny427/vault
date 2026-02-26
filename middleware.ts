import { type NextRequest } from 'next/server';
import { updateSession } from './legacy/lib/supabaseServer';

// Keep Supabase auth cookies in sync so Route Handlers can read the user session.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
