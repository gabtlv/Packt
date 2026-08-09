import Image from "next/image";

import { formatSerial } from "@/lib/cards";
import type { CardRow } from "@/lib/database.types";
import { resolvePhotoUrl } from "@/lib/images";

type Props = {
  card: CardRow;
  packName: string;
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
 * The card front. The photo is used exactly as uploaded — the frame, keylined art
 * window, scrimmed nameplate and flavour strip are what make it read as a card.
 */
export function CardFront({
  card,
  packName,
  size = "thumb",
  priority,
  facingAway,
  photoUrl,
}: Props) {
  const path = size === "full" ? card.photo_path : card.thumb_path;

  return (
    <div
      className="card__face"
      data-rarity={card.rarity}
      aria-hidden={facingAway}
      inert={facingAway ? true : undefined}
    >
      <div className="card__art">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URLs can't be optimised
          <img src={photoUrl} alt="" />
        ) : path ? (
          <Image
            src={resolvePhotoUrl(path)}
            alt={`${card.display_name}'s card photo`}
            width={size === "full" ? 1200 : 400}
            height={size === "full" ? 1680 : 560}
            // Phones show the sheet two-up, so a pocket card is ~46vw there.
            sizes={size === "full" ? "420px" : "(max-width: 640px) 46vw, 220px"}
            priority={priority}
          />
        ) : (
          // The contribute preview renders before a photo is chosen, so there is a
          // real state with no image path at all. Without this branch next/image
          // gets an empty src and throws.
          <span className="card__art-empty">Your photo</span>
        )}
      </div>

      <div className="card__plate">
        <span className="card__name">{card.display_name}</span>
        {card.school_or_work ? (
          <span className="card__affil">{card.school_or_work}</span>
        ) : null}
      </div>

      <div className="card__strip">
        <p className="card__flavour">{card.fun_fact}</p>
        <div className="card__footer">
          <span>{packName}</span>
          <span className="card__serial">{formatSerial(card.serial)}</span>
        </div>
      </div>

      <div className="card__foil" aria-hidden="true" />
      {/* Specular band, swept across the face only while the card is turning.
          Kept separate from the pointer-driven foil so the two never fight over
          the same opacity. */}
      <div className="card__gloss" aria-hidden="true" />
    </div>
  );
}
