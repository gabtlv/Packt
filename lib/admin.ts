import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/** True when the signed-in member's email is in public.admin_emails. */
export async function isAdmin(
  supabase: SupabaseClient<Database>,
  user?: User | null,
): Promise<boolean> {
  if (user === null) return false;
  if (user === undefined) {
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();
    if (!sessionUser) return false;
  }

  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}
