import type { SupabaseClient } from "@supabase/supabase-js";

import type { CardRow, Database } from "@/lib/database.types";
import type { ContributeInput } from "@/lib/schemas";

export class AlreadyContributedError extends Error {
  constructor() {
    super("You've already added a card to this set.");
    this.name = "AlreadyContributedError";
  }
}

/**
 * Creates a member's card and contributes it to a pack in one insert.
 *
 * The PRD split this into `POST /cards` then `POST /packs/:id/contribute`, but a
 * card has no meaning outside a pack and a two-phase flow can half-fail and leave
 * an orphan. Inserting once also means the trigger that mints the pack grant fires
 * in the same transaction, so "contributed but earned nothing" is not a reachable
 * state.
 *
 * `owner_id` and `display_name` come from the session and profile, never from the
 * request body — and the cards_insert_own policy re-checks owner_id independently.
 *
 * This is the seam where a generated-art step would go: it would derive extra
 * columns from `photo_path` before the insert, with no change to routes or schema.
 */
export async function contributeCard(
  supabase: SupabaseClient<Database>,
  {
    packId,
    userId,
    displayName,
    input,
  }: {
    packId: string;
    userId: string;
    displayName: string;
    input: ContributeInput;
  },
): Promise<CardRow> {
  const { data, error } = await supabase
    .from("cards")
    .insert({
      pack_id: packId,
      owner_id: userId,
      display_name: displayName,
      photo_path: input.photo_path,
      thumb_path: input.thumb_path,
      border_variant: input.border_variant,
      school_or_work: input.school_or_work,
      favorite_media: input.favorite_media,
      social_label: input.social_label,
      social_url: input.social_url,
      prompt_1_key: input.prompt_1_key,
      prompt_1_answer: input.prompt_1_answer,
      prompt_2_key: input.prompt_2_key,
      prompt_2_answer: input.prompt_2_answer,
      fun_fact: input.fun_fact,
    })
    .select("*")
    .single();

  if (error) {
    // unique (pack_id, owner_id) — one contribution per person per pack.
    if (error.code === "23505") throw new AlreadyContributedError();
    throw error;
  }

  return data;
}
