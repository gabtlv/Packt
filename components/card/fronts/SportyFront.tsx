import { CardPhoto } from "@/components/card/CardPhoto";
import type { CardRow } from "@/lib/database.types";

type Props = {
  card: CardRow;
  size?: "thumb" | "full";
  priority?: boolean;
  photoUrl?: string;
};

/**
 * The Sporty front: a tall keylined art window on the coloured mat, a swept
 * grey arc over it, and a black name banner running off the right edge with the
 * orange decal sitting in front of it.
 *
 * Laid out in percentages of the 300×420 Figma frame, which is the 5:7 the card
 * shell already locks — so every offset here is the Figma coordinate over 300 or
 * 420, and the whole face scales with the pocket it lands in.
 */
export function SportyFront({ card, size, priority, photoUrl }: Props) {
  return (
    <>
      {/* Sits under the art, so it only darkens the mat showing past the art's
          rounded bottom — which is what stops the base reading as flat orange. */}
      <div className="card__sporty-wash" aria-hidden="true" />

      <div className="card__art card__art--sporty">
        <CardPhoto
          card={card}
          size={size}
          priority={priority}
          photoUrl={photoUrl}
        />
      </div>

      {/* Far larger than the card and clipped by it: only the bottom of the arc
          crosses the face. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- an SVG decal, which next/image would only add a request to */}
      <img
        className="card__sporty-arc"
        src="/card/sporty-curve.svg"
        alt=""
        aria-hidden="true"
      />

      <div className="card__banner">
        <span
          className="card__banner-rule card__banner-rule--top"
          aria-hidden="true"
        />
        <span
          className="card__banner-rule card__banner-rule--bottom"
          aria-hidden="true"
        />
        <span className="card__name">{card.display_name}</span>
        {card.school_or_work ? (
          <span className="card__affil">{card.school_or_work}</span>
        ) : null}
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- an SVG decal, which next/image would only add a request to */}
      <img
        className="card__sporty-decal"
        src="/card/sporty-orange.svg"
        alt=""
        aria-hidden="true"
      />
    </>
  );
}
