import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, PackRow } from "@/lib/database.types";

export const DEFAULT_PACK_SLUG = "summerhacks";

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
  hasContributed: boolean;
  unopenedPacks: number;
};

/**
 * Whether the signed-in member has contributed to this pack and how many unopened
 * packs they hold. Drives both the contribute gate and the "Open your pack" call
 * to action, in one round trip.
 */
export async function getMyPackStatus(
  supabase: SupabaseClient<Database>,
  packId: string,
): Promise<PackStatus> {
  const { data, error } = await supabase.rpc("my_pack_status", {
    p_pack_id: packId,
  });

  if (error || !data?.[0]) return { hasContributed: false, unopenedPacks: 0 };

  return {
    hasContributed: data[0].has_contributed,
    unopenedPacks: data[0].unopened_packs,
  };
}
