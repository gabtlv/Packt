import { NextResponse, type NextRequest } from "next/server";

import { createPackSchema } from "@/lib/schemas";
import { createPack, PackCreateError } from "@/lib/services/packs";
import { createClient } from "@/lib/supabase/server";

/** Create a new event binder. Restricted to emails in admin_emails. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const parsed = createPackSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_pack", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  try {
    const pack = await createPack(supabase, parsed.data);
    return NextResponse.json({ pack }, { status: 201 });
  } catch (error) {
    if (error instanceof PackCreateError) {
      const status =
        error.reason === "not_authenticated"
          ? 401
          : error.reason === "not_admin"
            ? 403
            : error.reason === "slug_taken"
              ? 409
              : 422;
      return NextResponse.json({ error: error.reason }, { status });
    }

    console.error("create pack failed", error);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
