import { CardPhoto } from "@/components/card/CardPhoto";
import type { CardRow } from "@/lib/database.types";

type Props = {
  card: CardRow;
  size?: "thumb" | "full";
  priority?: boolean;
  photoUrl?: string;
};

/**
 * The Vintage front. Note the inversion against Sporty: the location is the slab
 * headline across the top and the name sits in the black plate at the foot, with
 * the star breaking out over the plate's right edge.
 *
 * Same percentage grid as SportyFront — Figma coordinates over the 300×420 frame.
 */
export function VintageFront({ card, size, priority, photoUrl }: Props) {
  return (
    <>
      {/* The coloured band is drawn as an overlay rather than a border on the
          face, so everything below can keep positioning against the full frame. */}
      <div className="card__vintage-frame" aria-hidden="true" />

      {card.school_or_work ? (
        <span className="card__affil">{card.school_or_work}</span>
      ) : null}

      <div className="card__art card__art--vintage">
        <CardPhoto
          card={card}
          size={size}
          priority={priority}
          photoUrl={photoUrl}
        />
      </div>

      <div className="card__plate card__plate--vintage">
        <span className="card__name">{card.display_name}</span>
      </div>

      <span className="card__vintage-star" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- an SVG decal, which next/image would only add a request to */}
        <img src="/card/vintage-star.svg" alt="" />
      </span>
    </>
  );
}
