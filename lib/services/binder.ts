import type { SupabaseClient } from "@supabase/supabase-js";

import type { CardRow, Database } from "@/lib/database.types";

/** Nine pockets to a binder page, like the real thing. */
export const POCKETS_PER_PAGE = 9;

export type BinderView = {
  cards: CardRow[];
  /** Google avatars for the members these cards are about, keyed by owner id. */
  avatars: Record<string, string | null>;
  page: number;
  pageCount: number;
  total: number;
};

/**
 * Reads one page of a pack's binder.
 *
 * `collector` is the whole "My Cards" feature: null shows the entire public pack,
 * a user id narrows it to the cards that member contributed or pulled. There is no
 * separate private binder to read from — it is the same rows, filtered.
 */
export async function getBinderPage(
  supabase: SupabaseClient<Database>,
  packId: string,
  { collector, page = 1 }: { collector?: string | null; page?: number },
): Promise<BinderView> {
  const { data, error } = await supabase.rpc("binder_cards", {
    p_pack_id: packId,
    p_collector: collector ?? null,
  });

  if (error) throw error;

  const all = data ?? [];
  const pageCount = Math.max(1, Math.ceil(all.length / POCKETS_PER_PAGE));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * POCKETS_PER_PAGE;
  const cards = all.slice(start, start + POCKETS_PER_PAGE);

  return {
    cards,
    avatars: await getAvatars(supabase, cards),
    page: current,
    pageCount,
    total: all.length,
  };
}

/**
 * Avatars are fetched for the visible page only, so a 500-card pack still costs one
 * small query per view.
 */
async function getAvatars(
  supabase: SupabaseClient<Database>,
  cards: CardRow[],
): Promise<Record<string, string | null>> {
  const ownerIds = [...new Set(cards.map((c) => c.owner_id))];
  if (ownerIds.length === 0) return {};

  const { data } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .in("id", ownerIds);

  return Object.fromEntries((data ?? []).map((p) => [p.id, p.avatar_url]));
}

/** Card ids the given member holds, used to badge cards in the unfiltered view. */
export async function getHeldCardIds(
  supabase: SupabaseClient<Database>,
  packId: string,
  userId: string,
): Promise<Set<string>> {
  const [pulls, contributed] = await Promise.all([
    supabase.from("pulls").select("card_id").eq("pack_id", packId).eq("user_id", userId),
    supabase.from("cards").select("id").eq("pack_id", packId).eq("owner_id", userId),
  ]);

  return new Set([
    ...(pulls.data ?? []).map((p) => p.card_id),
    ...(contributed.data ?? []).map((c) => c.id),
  ]);
}
