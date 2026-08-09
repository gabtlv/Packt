import Link from "next/link";

import { PackIntro } from "@/components/pack/PackIntro";
import { SiteHeader } from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { getBinderPage } from "@/lib/services/binder";
import {
  DEFAULT_PACK_SLUG,
  getPackBySlug,
  listPacks,
} from "@/lib/services/packs";

/**
 * Site home — the welcome for the default set when it exists, otherwise the
 * first binder on the shelf. Empty shelf → point people at All Binders.
 */
export default async function HomeRoute({ searchParams }: PageProps<"/">) {
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;

  const supabase = await createClient();
  const preferred = await getPackBySlug(supabase, DEFAULT_PACK_SLUG);
  const pack = preferred ?? (await listPacks(supabase))[0] ?? null;
  const preview = pack
    ? await getBinderPage(supabase, pack.id, { page: 1 })
    : null;

  return (
    <>
      <SiteHeader next={pack ? `/packs/${pack.slug}` : "/packs"} />

      {pack && preview ? (
        <PackIntro
          pack={pack}
          cards={preview.cards}
          avatars={preview.avatars}
          error={error}
          blurb={false}
        />
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14">
          {error ? (
            <p role="alert" className="mb-4 text-sm text-stamp">
              Sign-in didn&apos;t complete: {error}
            </p>
          ) : null}
          <h1 className="display text-4xl">No binders yet</h1>
          <p className="mt-3 max-w-md text-ink-soft">
            Event sets will show up on the bookshelf when organizers put them
            there.
          </p>
          <Link href="/packs" className="btn btn--accent mt-6">
            All Binders
          </Link>
        </main>
      )}
    </>
  );
}
