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
 *
 * Motion shape: four nested transform layers, because the card is doing four
 * things at once on four different clocks and one transform can only be on one
 * of them. Lift eases in and out with hover/press, pop is a one-shot keyframe
 * fired by a click, tilt has to track the pointer with no easing at all, and the
 * flip has to keep its whole arc even while the pointer is still moving over the
 * card. Collapsing any two of them into one element means whichever wins the
 * `transform` property cancels the other — which is what used to make a click
 * land the far face instantly whenever the pointer was hovering.
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
  const [pressed, setPressed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const backId = useId();

  const flip = useCallback(() => {
    setFlipped((f) => !f);

    // Restart the one-shot flip choreography (pop, bloom, gloss sweep). Written
    // to the DOM rather than held in state because re-flipping mid-flip has to
    // replay the animations from zero, and CSS only restarts an animation when
    // it stops matching and matches again — hence the forced reflow between.
    const el = ref.current;
    if (!el) return;
    delete el.dataset.flipping;
    void el.offsetWidth;
    el.dataset.flipping = "true";
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Tilt is a pointer affordance. On touch it fights scrolling, so skip it.
      if (event.pointerType !== "mouse") return;
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;

      // No mirroring for the flipped state: tilt is an ancestor of the flip, so
      // it is applied last, in screen space, and tracks the pointer either way.
      el.style.setProperty("--ry", `${(px - 0.5) * 2 * MAX_TILT}deg`);
      el.style.setProperty("--rx", `${-(py - 0.5) * 2 * MAX_TILT}deg`);
      el.style.setProperty("--foil-angle", `${90 + (px - 0.5) * 120}deg`);
      setTilting(true);
    },
    [],
  );

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setTilting(false);
    setPressed(false);
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
      data-pressed={pressed}
      onClick={flip}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
    >
      {/* Sits behind the card, so it can bloom past the edges during a flip
          without ever being a lit rectangle over an edge-on card. */}
      <span className="card__glow" aria-hidden="true" />

      <div className="card-lift">
        <div className="card-pop">
          <div className="card-tilt">
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
          </div>
        </div>
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
