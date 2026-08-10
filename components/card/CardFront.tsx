import { SportyFront } from "@/components/card/fronts/SportyFront";
import { VintageFront } from "@/components/card/fronts/VintageFront";
import type { CardRow } from "@/lib/database.types";

type Props = {
  card: CardRow;
  /** Grid cards load the small derivative; a featured card loads the full one. */
  size?: "thumb" | "full";
  priority?: boolean;
  /** True when this face is turned away, so it should leave the a11y tree. */
  facingAway?: boolean;
  /**
   * A local blob: URL, used by the contribute preview before anything is uploaded.
   * Bypasses storage resolution and image optimisation, which can't handle blobs.
   */
  photoUrl?: string;
};

/**
 * The card front. The photo is used exactly as uploaded — the framing is what
 * makes it read as a card, and there are two framings to choose from.
 *
 * This component owns everything the two designs share (the face box, the
 * accessibility state when turned away, the foil and gloss passes) so a design
 * only has to describe its own printing. Pack name and serial are not on either
 * front; they live on the back.
 */
export function CardFront({
  card,
  size = "thumb",
  priority,
  facingAway,
  photoUrl,
}: Props) {
  // An unrecognised value still has to render something — a card in the binder
  // is not the place to discover a typo in the database.
  const design = card.card_design === "vintage" ? "vintage" : "sporty";
  const Design = design === "vintage" ? VintageFront : SportyFront;

  return (
    <div
      className={`card__face card__face--${design}`}
      data-rarity={card.rarity}
      aria-hidden={facingAway}
      inert={facingAway ? true : undefined}
    >
      <Design
        card={card}
        size={size}
        priority={priority}
        photoUrl={photoUrl}
      />

      <div className="card__foil" aria-hidden="true" />
      {/* Specular band, swept across the face only while the card is turning.
          Kept separate from the pointer-driven foil so the two never fight over
          the same opacity. */}
      <div className="card__gloss" aria-hidden="true" />
    </div>
  );
}
