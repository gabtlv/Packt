import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, ProfileRow } from "@/lib/database.types";

/**
 * Returns the signed-in member's profile, creating it from auth metadata if the
 * signup trigger never ran (e.g. they signed in before migrations were applied).
 */
export async function ensureMyProfile(
  supabase: SupabaseClient<Database>,
): Promise<ProfileRow> {
  const { data, error } = await supabase.rpc("ensure_my_profile");
  if (error) throw error;
  return data;
}
