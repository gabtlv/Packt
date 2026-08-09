import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, PackRow } from "@/lib/database.types";

export const DEFAULT_PACK_SLUG = "summerhacks";

/** Hard cap enforced by enforce_cards_per_pack_limit() in the database. */
export const MAX_CARDS_PER_PACK = 5;

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
