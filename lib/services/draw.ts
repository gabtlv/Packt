import type { SupabaseClient } from "@supabase/supabase-js";

import type { CardRow, Database } from "@/lib/database.types";

/** Why a pack couldn't be opened. Mirrors the SQLSTATEs raised by open_pack(). */
export type DrawFailure =
  | "not_authenticated"
  | "no_unopened_pack"
  | "pool_exhausted"
  | "unknown";

export class DrawError extends Error {
  readonly reason: DrawFailure;

  constructor(reason: DrawFailure, cause?: unknown) {
    super(reason);
    this.name = "DrawError";
    this.reason = reason;
    this.cause = cause;
  }
}

const BY_SQLSTATE: Record<string, DrawFailure> = {
  "28000": "not_authenticated",
  P0001: "no_unopened_pack",
  P0002: "pool_exhausted",
};

/**
 * Opens one pack.
 *
 * All of the rules — one grant consumed, never your own card, never a duplicate,
 * refund if the pool is dry — live inside the open_pack() function so they hold in a
 * single transaction. This wrapper only translates Postgres error codes into
 * something the UI can speak. Nothing here re-implements or double-checks the rules;
 * doing so would create a second, weaker copy of them.
 */
export async function openPack(
  supabase: SupabaseClient<Database>,
  packId: string,
): Promise<CardRow> {
  const { data, error } = await supabase.rpc("open_pack", { p_pack_id: packId });

  if (error) {
    // Supabase surfaces the SQLSTATE as `code`; fall back to matching the message
    // for transports that only carry the text.
    const reason =
      BY_SQLSTATE[error.code ?? ""] ??
      (Object.values(BY_SQLSTATE).find((r) => error.message?.includes(r)) ||
        "unknown");
    throw new DrawError(reason, error);
  }

  if (!data) throw new DrawError("unknown");

  return data;
}

export const DRAW_MESSAGES: Record<DrawFailure, string> = {
  not_authenticated: "Sign in to open a pack.",
  no_unopened_pack:
    "You don't have a pack waiting. Add your card to the pool to earn one.",
  pool_exhausted:
    "You've collected everyone in this set. Check back as more people add their cards.",
  unknown: "Couldn't open that pack. Try again in a moment.",
};
