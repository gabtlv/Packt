import { NextResponse, type NextRequest } from "next/server";

import { contributeSchema } from "@/lib/schemas";
import { AlreadyContributedError, contributeCard } from "@/lib/services/cards";
import { getPackBySlug } from "@/lib/services/packs";
import { createClient } from "@/lib/supabase/server";

/**
 * Create a card and contribute it to this pack. Contributing mints one unopened
 * pack, via the database trigger, in the same transaction.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext<"/api/packs/[slug]/cards">,
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

  const parsed = contributeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_card", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  // The name on the card comes from the Google identity, not the request body.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  try {
    const card = await contributeCard(supabase, {
      packId: pack.id,
      userId: user.id,
      displayName:
        profile?.display_name ?? user.email?.split("@")[0] ?? "Anonymous",
      input: parsed.data,
    });

    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    if (error instanceof AlreadyContributedError) {
      return NextResponse.json({ error: "already_contributed" }, { status: 409 });
    }

    console.error("contribute failed", error);
    return NextResponse.json({ error: "contribute_failed" }, { status: 500 });
  }
}
