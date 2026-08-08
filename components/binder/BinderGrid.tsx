"use client";

import { useEffect, useRef, useState } from "react";

import { Card } from "@/components/card/Card";
import { useLiveBinder } from "@/components/binder/useLiveBinder";
import type { CardRow } from "@/lib/database.types";
import { POCKETS_PER_PAGE } from "@/lib/services/binder";

type Props = {
  cards: CardRow[];
  avatars: Record<string, string | null>;
  packId: string;
  packName: string;
  heldCardIds?: string[];
};

/**
 * A binder page: nine sleeve pockets, with the empty ones left visible.
 *
 * The empty pockets are deliberate rather than decorative — a half-full page is
 * what makes "this gets better as more people join" legible without saying it.
 */
export function BinderGrid({
  cards,
  avatars,
  packId,
  packName,
  heldCardIds,
}: Props) {
  const held = new Set(heldCardIds ?? []);
  const freshIds = useFreshCards(cards);
  useLiveBinder(packId);

  const pockets = Array.from({ length: POCKETS_PER_PAGE }, (_, i) => cards[i]);

  return (
    <div className="binder">
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
    </div>
  );
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
