import { notFound } from "next/navigation";

import { PackIntro } from "@/components/pack/PackIntro";
import { SiteHeader } from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { getBinderPage } from "@/lib/services/binder";
import { getPackBySlug } from "@/lib/services/packs";

/**
 * Per-set welcome: how contributing works, plus a fan of cards from this binder.
 * Reachable from the binder title once you're already inside the set.
 */
export default async function PackAboutRoute({
  params,
}: PageProps<"/packs/[slug]/about">) {
  const { slug } = await params;

  const supabase = await createClient();
  const pack = await getPackBySlug(supabase, slug);
  if (!pack) notFound();

  const preview = await getBinderPage(supabase, pack.id, { page: 1 });

  return (
    <>
      <SiteHeader next={`/packs/${slug}`} />
      <PackIntro
        pack={pack}
        cards={preview.cards}
        avatars={preview.avatars}
      />
    </>
  );
}
