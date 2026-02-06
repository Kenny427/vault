import { createServerClient } from '@supabase/ssr'

/**
 * Create a Supabase client for API routes (Pages Router)
 * Reads cookies from the request object
 */
export function createServerSupabaseClient(request: Request) {
    const cookieHeader = request.headers.get('cookie') || ''

    // Parse cookies from header with error handling
    const parseCookies = (cookieString: string): Record<string, string> => {
        return cookieString
            .split(';')
            .map(c => c.trim())
            .reduce((acc, cookie) => {
                const [key, value] = cookie.split('=')
                if (key && value) {
                    try {
                        // Try to decode, but use raw value if it fails
                        acc[key] = decodeURIComponent(value)
                    } catch (e) {
                        // If decoding fails (malformed URI), use the raw value
                        acc[key] = value
                    }
                }
                return acc
            }, {} as Record<string, string>)
    }

    const cookies = parseCookies(cookieHeader)

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookies[name]
                },
                set() {
                    // Not needed for read-only operations in API routes
                },
                remove() {
                    // Not needed for read-only operations in API routes
                },
            },
        }
    )
}
