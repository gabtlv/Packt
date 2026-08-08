import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";

/**
 * Refreshes the Supabase session on every request and rewrites the auth cookies
 * onto the outgoing response.
 *
 * Two things here are load-bearing and easy to break:
 *   - Nothing may run between createServerClient and getUser(), or sessions
 *     refresh inconsistently and users appear randomly signed out.
 *   - The returned response must be the same object whose cookies were set. If
 *     you build a fresh NextResponse, copy the cookies across first.
 *
 * Note this does NOT gate routes: the binder is deliberately public so a stranger
 * can open the shared link without signing in. Pages that need a user redirect
 * themselves.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
