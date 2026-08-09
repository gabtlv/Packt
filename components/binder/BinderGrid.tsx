"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/card/Card";
import { binderHref } from "@/components/binder/binderHref";
import { useLiveBinder } from "@/components/binder/useLiveBinder";
import type { CardRow } from "@/lib/database.types";
import { POCKETS_PER_PAGE } from "@/lib/services/binder";

type Props = {
  cards: CardRow[];
  avatars: Record<string, string | null>;
  packId: string;
  packName: string;
  heldCardIds?: string[];
  slug: string;
  collector: string;
  page: number;
  pageCount: number;
};

/**
 * A binder page: nine sleeve pockets, with the empty ones left visible.
 *
 * Page turns happen on the left/right edges of the binder itself — grab a side
 * like you would a real sleeve page — instead of a pager parked below.
 */
export function BinderGrid({
  cards,
  avatars,
  packId,
  packName,
  heldCardIds,
  slug,
  collector,
  page,
  pageCount,
}: Props) {
  const held = new Set(heldCardIds ?? []);
  const freshIds = useFreshCards(cards);
  const turn = usePageTurn(page);
  useLiveBinder(packId);
  useKeyboardPaging(slug, collector, page, pageCount);

  const pockets = Array.from({ length: POCKETS_PER_PAGE }, (_, i) => cards[i]);
  const canPrev = page > 1;
  const canNext = page < pageCount;

  return (
    <div
      key={page}
      className={[
        "binder",
        turn === "forward" ? "binder--turn-forward" : "",
        turn === "back" ? "binder--turn-back" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {canPrev ? (
        <Link
          href={binderHref(slug, collector, page - 1)}
          className="binder__turn binder__turn--prev"
          aria-label={`Previous page, ${page - 1} of ${pageCount}`}
          prefetch
        >
          <span className="binder__turn-cue" aria-hidden="true">
            ‹
          </span>
        </Link>
      ) : (
        <span className="binder__turn binder__turn--prev" aria-hidden="true" />
      )}

      <div className="binder__rings" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="binder__ring" />
        ))}
      </div>

      <ul className="binder__pockets">
        {pockets.map((card, index) => (
          <li
            key={card?.id ?? `empty-${index}`}
            className={[
              "pocket",
              card ? "" : "pocket--empty",
              card && freshIds.has(card.id) ? "pocket--fresh" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {card ? (
              <>
                <Card
                  card={card}
                  packName={packName}
                  avatarUrl={avatars[card.owner_id]}
                  priority={index < 3}
                />
                {held.has(card.id) ? (
                  <span className="pocket__mine">Yours</span>
                ) : null}
              </>
            ) : (
              <span className="sr-only">Empty pocket</span>
            )}
          </li>
        ))}
      </ul>

      {canNext ? (
        <Link
          href={binderHref(slug, collector, page + 1)}
          className="binder__turn binder__turn--next"
          aria-label={`Next page, ${page + 1} of ${pageCount}`}
          prefetch
        >
          <span className="binder__turn-cue" aria-hidden="true">
            ›
          </span>
        </Link>
      ) : (
        <span className="binder__turn binder__turn--next" aria-hidden="true" />
      )}

      {pageCount > 1 ? (
        <p className="binder__folio label" aria-live="polite">
          Page {page} / {pageCount}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Direction of the latest page change, computed during render so the mount of
 * the new sheet can play the matching turn animation immediately.
 */
function usePageTurn(page: number): "forward" | "back" | null {
  const previous = useRef(page);
  const turn =
    page === previous.current
      ? null
      : page > previous.current
        ? "forward"
        : "back";

  useEffect(() => {
    previous.current = page;
  }, [page]);

  return turn;
}

/** Arrow keys flip pages when focus isn't in a form field. */
function useKeyboardPaging(
  slug: string,
  collector: string,
  page: number,
  pageCount: number,
) {
  const router = useRouter();

  useEffect(() => {
    if (pageCount <= 1) return;

    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      if (event.key === "ArrowRight" && page < pageCount) {
        event.preventDefault();
        router.push(binderHref(slug, collector, page + 1));
      } else if (event.key === "ArrowLeft" && page > 1) {
        event.preventDefault();
        router.push(binderHref(slug, collector, page - 1));
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slug, collector, page, pageCount, router]);
}

/**
 * Ids that appeared since the last render, so cards arriving over Realtime can
 * slide into their pocket instead of popping in. The first render marks nothing as
 * fresh — otherwise the whole page would animate on load.
 */
function useFreshCards(cards: CardRow[]): Set<string> {
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    const ids = cards.map((c) => c.id);

    if (seen.current === null) {
      seen.current = new Set(ids);
      return;
    }

    const added = ids.filter((id) => !seen.current!.has(id));
    ids.forEach((id) => seen.current!.add(id));

    if (added.length > 0) setFresh(new Set(added));
  }, [cards]);

  return fresh;
}
