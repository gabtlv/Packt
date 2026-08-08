import Link from "next/link";

import { signInWithGoogle, signOut } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/server";

type Props = {
  /** Where to return after signing in. */
  next?: string;
};

export async function SiteHeader({ next = "/packs/summerhacks" }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-sleeve-edge">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <Link href="/" className="display text-lg no-underline">
          Card Binder
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/packs" className="label no-underline hover:underline">
            All packs
          </Link>

          {user ? (
            <form action={signOut}>
              <button type="submit" className="btn btn--quiet">
                Sign out
              </button>
            </form>
          ) : (
            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value={next} />
              <button type="submit" className="btn">
                Sign in with Google
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
