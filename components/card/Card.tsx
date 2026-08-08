"use client";

import { useCallback, useId, useRef, useState } from "react";

import { CardBack } from "@/components/card/CardBack";
import { CardFront } from "@/components/card/CardFront";
import { variantStyle } from "@/lib/cards";
import type { CardRow } from "@/lib/database.types";

const MAX_TILT = 9; // degrees

type Props = {
  card: CardRow;
  packName: string;
  avatarUrl?: string | null;
  size?: "thumb" | "full";
  priority?: boolean;
  /** Local blob: URL for the contribute preview, before anything is uploaded. */
  photoUrl?: string;
};

/**
 * Interactive card: tilts toward the pointer, sweeps its foil with it, and flips
 * between faces.
 *
 * Accessibility shape, which is the reason this isn't simply a <button> wrapping
 * everything: the card's text is real content that should be readable, and a
 * button's contents collapse into its accessible name. So the card body stays
 * plain markup, a dedicated flip control carries the interaction for keyboard and
 * screen-reader users, and pointer users can additionally click anywhere on the
 * card. Only the face currently showing is exposed to assistive tech — otherwise
 * both faces would be read out at once, since backface-visibility is purely
 * visual.
 */
export function Card({
  card,
  packName,
  avatarUrl,
  size,
  priority,
  photoUrl,
}: Props) {
  const [flipped, setFlipped] = useState(false);
  const [tilting, setTilting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const backId = useId();

  const flip = useCallback(() => setFlipped((f) => !f), []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Tilt is a pointer affordance. On touch it fights scrolling, so skip it.
      if (event.pointerType !== "mouse") return;
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;

      // Flipping mirrors the card, so mirror the horizontal tilt to keep it
      // tracking the pointer rather than running away from it.
      const direction = flipped ? -1 : 1;
      el.style.setProperty("--ry", `${(px - 0.5) * 2 * MAX_TILT * direction}deg`);
      el.style.setProperty("--rx", `${-(py - 0.5) * 2 * MAX_TILT}deg`);
      el.style.setProperty("--foil-angle", `${90 + (px - 0.5) * 120}deg`);
      setTilting(true);
    },
    [flipped],
  );

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setTilting(false);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }, []);

  return (
    <div
      ref={ref}
      className="card-shell"
      style={variantStyle(card.border_variant)}
      data-tilting={tilting}
      data-flipped={flipped}
      onClick={flip}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div className="card">
        <CardFront
          card={card}
          packName={packName}
          size={size}
          priority={priority}
          facingAway={flipped}
          photoUrl={photoUrl}
        />
        <CardBack
          id={backId}
          card={card}
          packName={packName}
          avatarUrl={avatarUrl}
          facingAway={!flipped}
        />
      </div>

      <button
        type="button"
        className="card__flip"
        aria-expanded={flipped}
        aria-controls={backId}
        onClick={(event) => {
          // The shell already handles the click; don't let it flip back.
          event.stopPropagation();
          flip();
        }}
      >
        <span className="sr-only">
          {flipped
            ? `Show the front of ${card.display_name}'s card`
            : `Show the back of ${card.display_name}'s card`}
        </span>
        <span aria-hidden="true">⇄</span>
      </button>
    </div>
  );
}
