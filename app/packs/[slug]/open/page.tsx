import Link from "next/link";
import { notFound } from "next/navigation";

import { PackOpening } from "@/components/pack/PackOpening";
import { signInWithGoogle } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/server";
import { getMyPackStatus, getPackBySlug } from "@/lib/services/packs";

/**
 * The pack-opening ceremony — the one dark surface in the product, so the reveal
 * reads as an event rather than as another page of the app.
 */
export default async function OpenRoute({
  params,
}: PageProps<"/packs/[slug]/open">) {
  const { slug } = await params;

  const supabase = await createClient();
  const pack = await getPackBySlug(supabase, slug);
  if (!pack) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="stage flex flex-1 flex-col items-center justify-center px-5 py-16">
      <Link
        href={`/packs/${slug}`}
        className="label absolute top-5 left-5 text-sleeve no-underline hover:underline"
      >
        ‹ {pack.name}
      </Link>

      {user ? (
        <PackOpening
          slug={slug}
          packName={pack.name}
          packAccent={pack.accent}
          unopenedPacks={(await getMyPackStatus(supabase, pack.id)).unopenedPacks}
        />
      ) : (
        <div className="text-center">
          <h1 className="display text-3xl">Sign in to open a pack</h1>
          <p className="mx-auto mt-3 max-w-sm text-sleeve">
            Add your card to the pool and you&apos;ll earn one.
          </p>
          <form action={signInWithGoogle} className="mt-6">
            <input type="hidden" name="next" value={`/packs/${slug}/open`} />
            <button type="submit" className="btn btn--accent">
              Sign in with Google
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
