import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, PackRow } from "@/lib/database.types";
import type { CreatePackInput } from "@/lib/schemas";

export const DEFAULT_PACK_SLUG = "summerhacks";

/** Hard cap enforced by enforce_cards_per_pack_limit() in the database. */
export const MAX_CARDS_PER_PACK = 5;

export class PackCreateError extends Error {
  readonly reason: "not_authenticated" | "not_admin" | "slug_taken" | "invalid";

  constructor(
    reason: PackCreateError["reason"],
    message = reason,
  ) {
    super(message);
    this.name = "PackCreateError";
    this.reason = reason;
  }
}

export async function getPackBySlug(
  supabase: SupabaseClient<Database>,
  slug: string,
): Promise<PackRow | null> {
  const { data } = await supabase
    .from("packs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return data ?? null;
}

export async function listPacks(
  supabase: SupabaseClient<Database>,
): Promise<PackRow[]> {
  const { data } = await supabase
    .from("packs")
    .select("*")
    .order("created_at", { ascending: true });

  return data ?? [];
}

/**
 * Creates an event binder. Authorization lives in create_pack() — only emails in
 * admin_emails may call it successfully.
 */
export async function createPack(
  supabase: SupabaseClient<Database>,
  input: CreatePackInput,
): Promise<PackRow> {
  const { data, error } = await supabase.rpc("create_pack", {
    p_slug: input.slug,
    p_name: input.name,
    p_description: input.description,
    p_accent: input.accent,
  });

  if (error) {
    if (error.code === "28000" || error.message?.includes("not_authenticated")) {
      throw new PackCreateError("not_authenticated");
    }
    if (error.code === "42501" || error.message?.includes("not_admin")) {
      throw new PackCreateError("not_admin");
    }
    if (error.code === "23505" || error.message?.includes("slug_taken")) {
      throw new PackCreateError("slug_taken");
    }
    if (error.code === "22023") {
      throw new PackCreateError("invalid", error.message);
    }
    throw error;
  }

  if (!data) throw new PackCreateError("invalid");
  return data;
}

export type PackStatus = {
  contributionCount: number;
  unopenedPacks: number;
  hasContributed: boolean;
  canContribute: boolean;
};

/**
 * How many cards the signed-in member has added to this pack, and how many
 * unopened packs they hold. Drives the contribute gate and the "Open your pack"
 * call to action, in one round trip.
 */
export async function getMyPackStatus(
  supabase: SupabaseClient<Database>,
  packId: string,
): Promise<PackStatus> {
  const { data, error } = await supabase.rpc("my_pack_status", {
    p_pack_id: packId,
  });

  if (error || !data?.[0]) {
    return {
      contributionCount: 0,
      unopenedPacks: 0,
      hasContributed: false,
      canContribute: true,
    };
  }

  const contributionCount = data[0].contribution_count;
  return {
    contributionCount,
    unopenedPacks: data[0].unopened_packs,
    hasContributed: contributionCount > 0,
    canContribute: contributionCount < MAX_CARDS_PER_PACK,
  };
}
