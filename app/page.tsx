import Link from "next/link";

import { Card } from "@/components/card/Card";
import { SiteHeader } from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { getBinderPage } from "@/lib/services/binder";
import { DEFAULT_PACK_SLUG, getPackBySlug } from "@/lib/services/packs";

/**
 * Landing page. The hero is three real cards from the live set rather than a
 * description of them — the product is the artifact, so show the artifact.
 */
export default async function HomeRoute({ searchParams }: PageProps<"/">) {
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;

  const supabase = await createClient();
  const pack = await getPackBySlug(supabase, DEFAULT_PACK_SLUG);
  const preview = pack
    ? await getBinderPage(supabase, pack.id, { page: 1 })
    : null;

  const heroCards = preview?.cards.slice(0, 3) ?? [];

  return (
    <>
      <SiteHeader next={`/packs/${DEFAULT_PACK_SLUG}`} />

      <main className="flex flex-1 flex-col justify-center">
        {error ? (
          <p
            role="alert"
            className="mx-auto mt-4 w-full max-w-6xl px-5 text-sm text-stamp"
          >
            Sign-in didn&apos;t complete: {error}
          </p>
        ) : null}

        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="label text-ink-soft">
              {pack?.name ?? "SummerHacks"} · {pack?.card_count ?? 0} cards in the pool
            </p>

            <h1 className="display mt-3 text-5xl sm:text-6xl">
              Make a card.
              <br />
              Pull a stranger.
            </h1>

            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              One photo, two questions, a fun fact. Your card goes into the
              cohort&apos;s shared binder — and adding it earns you a pack to open.
            </p>

            {/* Genuinely a sequence, so it's numbered. */}
            <ol className="mt-8 grid gap-3 border-l-2 border-sun pl-4">
              {[
                "Add your card to the pool.",
                "That earns you one pack.",
                "Open it and meet whoever you pull.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="label text-sun-ink">{`0${i + 1}`}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/packs/${DEFAULT_PACK_SLUG}/contribute`}
                className="btn btn--accent"
              >
                Add your card
              </Link>
              <Link href={`/packs/${DEFAULT_PACK_SLUG}`} className="btn btn--quiet">
                Browse the binder
              </Link>
            </div>
          </div>

          {/* Fanned cards: the artifact itself as the hero. */}
          {heroCards.length > 0 && pack ? (
            <div className="hero-fan" aria-label="Cards from the set">
              {heroCards.map((card, i) => (
                <div key={card.id} className="hero-fan__item" data-index={i}>
                  <Card
                    card={card}
                    packName={pack.name}
                    avatarUrl={preview?.avatars[card.owner_id]}
                    priority={i === 1}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-sleeve-edge p-8 text-center text-ink-soft">
              The pool is empty. The first card in the binder could be yours.
            </p>
          )}
        </section>
      </main>

      <footer className="border-t border-sleeve-edge">
        <p className="label mx-auto w-full max-w-6xl px-5 py-5 text-ink-soft">
          Every card here is public. Nothing you add is hidden in a private binder.
        </p>
      </footer>
    </>
  );
}
