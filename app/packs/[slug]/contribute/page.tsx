import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ContributeForm } from "@/components/create/ContributeForm";
import { SiteHeader } from "@/components/SiteHeader";
import { signInWithGoogle } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/server";
import {
  getMyPackStatus,
  getPackBySlug,
  MAX_CARDS_PER_PACK,
} from "@/lib/services/packs";

export default async function ContributeRoute({
  params,
}: PageProps<"/packs/[slug]/contribute">) {
  const { slug } = await params;

  const supabase = await createClient();
  const pack = await getPackBySlug(supabase, slug);
  if (!pack) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <SiteHeader next={`/packs/${slug}/contribute`} />
        <main className="mx-auto w-full max-w-md flex-1 px-5 py-16 text-center">
          <h1 className="display text-3xl">Sign in to add your card</h1>
          <p className="mt-3 text-ink-soft">
            Sign in so we can save your card to this pack.
          </p>
          <form action={signInWithGoogle} className="mt-6">
            <input
              type="hidden"
              name="next"
              value={`/packs/${slug}/contribute`}
            />
            <button type="submit" className="btn btn--accent">
              Sign in with Google
            </button>
          </form>
        </main>
      </>
    );
  }

  // Cap is enforced in the database; redirect once they've hit it rather than
  // letting them fill in a form that can only fail.
  const status = await getMyPackStatus(supabase, pack.id);
  if (!status.canContribute) {
    redirect(
      status.unopenedPacks > 0 ? `/packs/${slug}/open` : `/packs/${slug}?collector=me`,
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <SiteHeader next={`/packs/${slug}/contribute`} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <p className="label text-ink-soft">
          <Link href={`/packs/${slug}`} className="no-underline hover:underline">
            {pack.name}
          </Link>{" "}
          · Add your card
        </p>
        <h1 className="display mt-2 mb-8 text-4xl">
          {status.hasContributed ? "Make another card" : "Make your card"}
        </h1>
        {status.hasContributed ? (
          <p className="mb-8 text-ink-soft">
            {status.contributionCount} of {MAX_CARDS_PER_PACK} cards added to this
            set. Each one earns you another pack.
          </p>
        ) : null}

        <ContributeForm
          slug={slug}
          packName={pack.name}
          userId={user.id}
          suggestedName={
            profile?.display_name ?? user.email?.split("@")[0] ?? ""
          }
          avatarUrl={profile?.avatar_url ?? null}
          contributionCount={status.contributionCount}
        />
      </main>
    </>
  );
}
