import Link from "next/link";
import { notFound } from "next/navigation";

import { BinderGrid } from "@/components/binder/BinderGrid";
import { BinderPager } from "@/components/binder/BinderPager";
import { CollectorFilter } from "@/components/binder/CollectorFilter";
import { SiteHeader } from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import {
  getBinderPage,
  getHeldCardIds,
  POCKETS_PER_PAGE,
} from "@/lib/services/binder";
import { getMyPackStatus, getPackBySlug } from "@/lib/services/packs";

/**
 * The binder — the one public page every card lives on.
 *
 * `?collector=me` is the "My Cards" lens and `?collector=<uuid>` is any other
 * member's, both served by this same route and query. That is the shape of the
 * product: there is nowhere private for a card to be.
 */
export default async function BinderRoute({
  params,
  searchParams,
}: PageProps<"/packs/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;

  const supabase = await createClient();
  const pack = await getPackBySlug(supabase, slug);
  if (!pack) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requested = typeof query.collector === "string" ? query.collector : "all";
  const collector =
    requested === "me" ? (user ? user.id : "all") : requested;
  const page = Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1;

  const [view, mineView, status, held] = await Promise.all([
    getBinderPage(supabase, pack.id, {
      collector: collector === "all" ? null : collector,
      page,
    }),
    user
      ? getBinderPage(supabase, pack.id, { collector: user.id, page: 1 })
      : null,
    user ? getMyPackStatus(supabase, pack.id) : null,
    user ? getHeldCardIds(supabase, pack.id, user.id) : null,
  ]);

  const filterValue =
    collector === "all" ? "all" : user && collector === user.id ? "me" : collector;

  const otherName =
    filterValue !== "all" && filterValue !== "me"
      ? view.cards.find((c) => c.owner_id === collector)?.display_name
      : undefined;

  return (
    <>
      <SiteHeader next={`/packs/${slug}`} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label text-ink-soft">Set</p>
            <h1 className="display text-4xl sm:text-5xl">{pack.name}</h1>
            {pack.description ? (
              <p className="mt-2 max-w-xl text-ink-soft">{pack.description}</p>
            ) : null}
          </div>

          <PackActions
            slug={slug}
            signedIn={Boolean(user)}
            canContribute={status?.canContribute ?? true}
            hasContributed={status?.hasContributed ?? false}
            unopenedPacks={status?.unopenedPacks ?? 0}
          />
        </div>

        <div className="mb-4">
          <CollectorFilter
            slug={slug}
            collector={filterValue}
            signedIn={Boolean(user)}
            counts={{ all: pack.card_count, mine: mineView?.total ?? 0 }}
            viewingName={otherName}
          />
        </div>

        {view.total === 0 ? (
          <EmptyBinder signedIn={Boolean(user)} filter={filterValue} slug={slug} />
        ) : (
          <>
            <BinderGrid
              cards={view.cards}
              avatars={view.avatars}
              packId={pack.id}
              packName={pack.name}
              heldCardIds={held ? [...held] : []}
            />

            <p className="label mt-4 text-center text-ink-soft">
              {view.total} card{view.total === 1 ? "" : "s"} ·{" "}
              {view.pageCount * POCKETS_PER_PAGE - view.total} pocket
              {view.pageCount * POCKETS_PER_PAGE - view.total === 1 ? "" : "s"} still
              empty
            </p>

            <div className="mt-6">
              <BinderPager
                slug={slug}
                collector={filterValue}
                page={view.page}
                pageCount={view.pageCount}
              />
            </div>
          </>
        )}
      </main>
    </>
  );
}

function PackActions({
  slug,
  signedIn,
  canContribute,
  hasContributed,
  unopenedPacks,
}: {
  slug: string;
  signedIn: boolean;
  canContribute: boolean;
  hasContributed: boolean;
  unopenedPacks: number;
}) {
  if (!signedIn) {
    return (
      <p className="max-w-xs text-sm text-ink-soft">
        Sign in to add a card. Each card earns you a pack to open — up to five per
        set.
      </p>
    );
  }

  if (unopenedPacks > 0) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/packs/${slug}/open`} className="btn btn--accent">
          Open your pack{unopenedPacks > 1 ? ` (${unopenedPacks})` : ""}
        </Link>
        {canContribute ? (
          <Link href={`/packs/${slug}/contribute`} className="btn">
            {hasContributed ? "Add another card" : "Add your card"}
          </Link>
        ) : null}
      </div>
    );
  }

  if (canContribute) {
    return (
      <Link href={`/packs/${slug}/contribute`} className="btn btn--accent">
        {hasContributed ? "Add another card" : "Add your card"}
      </Link>
    );
  }

  return (
    <p className="max-w-xs text-sm text-ink-soft">
      You&apos;ve added five cards to this set. Open packs as the pool grows.
    </p>
  );
}

function EmptyBinder({
  signedIn,
  filter,
  slug,
}: {
  signedIn: boolean;
  filter: string;
  slug: string;
}) {
  const isMine = filter === "me";

  return (
    <div className="rounded-lg border border-dashed border-sleeve-edge p-10 text-center">
      <h2 className="display text-2xl">
        {isMine ? "You don't hold any cards yet" : "This set is empty"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-ink-soft">
        {isMine
          ? "Add your card to the pool. That earns you a pack, and whoever you pull lands here."
          : "Nobody has contributed yet. Be the first card in the binder."}
      </p>
      {signedIn ? (
        <Link href={`/packs/${slug}/contribute`} className="btn btn--accent mt-5">
          Add your card
        </Link>
      ) : null}
    </div>
  );
}
