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
      <div className="site-header mx-auto w-full max-w-6xl px-5 py-3">
        <Link href="/" className="site-header__brand display text-lg no-underline">
          Card Binder
        </Link>

        <Link href="/packs" className="site-header__binders">
          All Binders
        </Link>

        <div className="site-header__auth">
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
