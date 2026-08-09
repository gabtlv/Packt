import { PackIntro } from "@/components/pack/PackIntro";
import { SiteHeader } from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { getBinderPage } from "@/lib/services/binder";
import { DEFAULT_PACK_SLUG, getPackBySlug } from "@/lib/services/packs";

/**
 * Site home — the welcome for the default set. Other binders have the same
 * pitch at `/packs/[slug]/about`, linked from the binder title.
 */
export default async function HomeRoute({ searchParams }: PageProps<"/">) {
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;

  const supabase = await createClient();
  const pack = await getPackBySlug(supabase, DEFAULT_PACK_SLUG);
  const preview = pack
    ? await getBinderPage(supabase, pack.id, { page: 1 })
    : null;

  return (
    <>
      <SiteHeader next={`/packs/${DEFAULT_PACK_SLUG}`} />

      {pack && preview ? (
        <PackIntro
          pack={pack}
          cards={preview.cards}
          avatars={preview.avatars}
          error={error}
        />
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14">
          {error ? (
            <p role="alert" className="mb-4 text-sm text-stamp">
              Sign-in didn&apos;t complete: {error}
            </p>
          ) : null}
          <p className="text-ink-soft">
            No default set yet. Run the seed to create SummerHacks.
          </p>
        </main>
      )}
    </>
  );
}
