import Link from "next/link";

import { Card } from "@/components/card/Card";
import type { CardRow, PackRow } from "@/lib/database.types";

type Props = {
  pack: PackRow;
  cards: CardRow[];
  avatars: Record<string, string | null>;
  /** Optional OAuth error from the auth callback landing on `/`. */
  error?: string | null;
};

/**
 * How a set works: the three-step pitch plus a fan of real cards from the pool.
 * Used on the site home (default set) and on each binder's about page.
 */
export function PackIntro({ pack, cards, avatars, error }: Props) {
  const heroCards = cards.slice(0, 3);

  return (
    <>
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
              {pack.name} · {pack.card_count} card
              {pack.card_count === 1 ? "" : "s"} in the pool
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
                href={`/packs/${pack.slug}/contribute`}
                className="btn btn--accent"
              >
                Add your card
              </Link>
              <Link href={`/packs/${pack.slug}`} className="btn btn--quiet">
                Browse the binder
              </Link>
            </div>
          </div>

          {heroCards.length > 0 ? (
            <div className="hero-fan" aria-label={`Cards from ${pack.name}`}>
              {heroCards.map((card, i) => (
                <div key={card.id} className="hero-fan__item" data-index={i}>
                  <Card
                    card={card}
                    packName={pack.name}
                    avatarUrl={avatars[card.owner_id]}
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
