import { NextResponse, type NextRequest } from "next/server";

import { ensureMyProfile } from "@/lib/services/profiles";
import { createClient } from "@/lib/supabase/server";

/**
 * Google OAuth landing point: exchanges the authorization code for a session,
 * then returns the member to wherever they started (`next`).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const authError = searchParams.get("error_description") ?? searchParams.get("error");

  // Only allow same-origin relative paths, so a crafted link can't bounce someone
  // off-site through our callback.
  const requested = searchParams.get("next") ?? "/packs/summerhacks";
  const next = requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/packs/summerhacks";

  if (authError) {
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(authError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Heal users who signed in before handle_new_user existed.
  try {
    await ensureMyProfile(supabase);
  } catch (cause) {
    console.error("ensure_my_profile after OAuth failed", cause);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
