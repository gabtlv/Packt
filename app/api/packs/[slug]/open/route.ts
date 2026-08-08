import { NextResponse } from "next/server";

import { DrawError, openPack } from "@/lib/services/draw";
import { getPackBySlug } from "@/lib/services/packs";
import { createClient } from "@/lib/supabase/server";

const STATUS: Record<string, number> = {
  not_authenticated: 401,
  no_unopened_pack: 403,
  pool_exhausted: 409,
  unknown: 500,
};

/** Draw one card from this pack's pool, consuming one earned pack opening. */
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/packs/[slug]/open">,
) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const pack = await getPackBySlug(supabase, slug);
  if (!pack) {
    return NextResponse.json({ error: "pack_not_found" }, { status: 404 });
  }

  try {
    const card = await openPack(supabase, pack.id);

    // The card is about someone else, so fetch their avatar for the card back.
    const { data: owner } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", card.owner_id)
      .maybeSingle();

    return NextResponse.json({ card, avatarUrl: owner?.avatar_url ?? null });
  } catch (error) {
    if (error instanceof DrawError) {
      return NextResponse.json(
        { error: error.reason },
        { status: STATUS[error.reason] ?? 500 },
      );
    }

    console.error("open pack failed", error);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }
}
