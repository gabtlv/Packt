import Link from "next/link";

import { Card } from "@/components/card/Card";
import { FloralBackdrop } from "@/components/decor/FloralBackdrop";
import { GridIcon, PlusIcon, StackMark } from "@/components/decor/icons";
import type { CardRow, PackRow } from "@/lib/database.types";

const STEPS = [
  "Create and Add your Card.",
  "Receive a new Pack.",
  "Open and meet who you pull.",
];

type Props = {
  pack: PackRow;
  cards: CardRow[];
  avatars: Record<string, string | null>;
  /** Optional OAuth error from the auth callback landing on `/`. */
  error?: string | null;
  /**
   * The longer pitch under the headline. The home hero is deliberately spare,
   * so it opts out; the per-binder explainer keeps it.
   */
  blurb?: boolean;
};

/**
 * How a set works: the three-step pitch beside a pair of real cards from the
 * pool, set inside a framed sheet of stationery. Used on the site home
 * (default set) and on each binder's about page.
 */
export function PackIntro({
  pack,
  cards,
  avatars,
  error,
  blurb = true,
}: Props) {
  const heroCards = cards.slice(0, 2);

  return (
    <>
      <main className="fade-in flex flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-10">
        {error ? (
          <p
            role="alert"
            className="mx-auto mb-4 w-full max-w-6xl px-1 text-sm text-stamp"
          >
            Sign-in didn&apos;t complete: {error}
          </p>
        ) : null}

        <section className="hero-frame">
          <FloralBackdrop />

          <div className="hero-frame__inner">
            <div className="hero-lede">
              <p className="hero-eyebrow">
                {pack.name} <span aria-hidden="true">|</span> Pool (
                {pack.card_count} Card{pack.card_count === 1 ? "" : "s"})
              </p>

              <h1 className="display hero-title">
                Make a Card.
                <br />
                <span className="hero-title__line">
                  Pull a Stranger.
                  <StackMark className="hero-title__mark" />
                </span>
              </h1>

              {blurb ? (
                <p className="hero-blurb">
                  One photo, two questions, a fun fact. Your card goes into the
                  cohort&apos;s shared binder — and adding it earns you a pack to
                  open.
                </p>
              ) : null}
            </div>

            <div className="hero-aside">
              {heroCards.length > 0 ? (
                <div className="hero-pair" aria-label={`Cards from ${pack.name}`}>
                  {heroCards.map((card, i) => (
                    <div key={card.id} className="hero-pair__item">
                      <Card
                        card={card}
                        packName={pack.name}
                        avatarUrl={avatars[card.owner_id]}
                        priority={i === 0}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-sleeve-edge p-8 text-center text-ink-soft">
                  The pool is empty. The first card in the binder could be yours.
                </p>
              )}

              <ol className="hero-steps">
                {STEPS.map((step) => (
                  <li key={step} className="hero-steps__item">
                    <span className="hero-steps__dot" aria-hidden="true" />
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <div className="hero-actions">
                <Link href={`/packs/${pack.slug}/contribute`} className="btn">
                  <PlusIcon className="btn__icon" />
                  Create Card
                </Link>
                <Link href={`/packs/${pack.slug}`} className="btn btn--quiet">
                  <GridIcon className="btn__icon" />
                  Browse Pool
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p className="label mx-auto w-full max-w-6xl px-5 py-5 text-ink-soft">
          Every card here is public. Nothing you add is hidden in a private binder.
        </p>
      </footer>
    </>
  );
}