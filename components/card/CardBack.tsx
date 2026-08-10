import Image from "next/image";

import { formatSerial, initials, prettyUrl } from "@/lib/cards";
import type { CardRow } from "@/lib/database.types";

type Props = {
  card: CardRow;
  packName: string;
  /** Google avatar for the member this card is about, used as the contact photo. */
  avatarUrl?: string | null;
  /** True when this face is turned away, so it should leave the a11y tree. */
  facingAway?: boolean;
  id?: string;
};

/**
 * The card back, shared by both fronts: contact photo, location, the one thing
 * they said about their card, favourite media and one social link — the "how to
 * actually find this person" side.
 */
export function CardBack({ card, packName, avatarUrl, facingAway, id }: Props) {
  return (
    <div
      id={id}
      className="card__face card__face--back"
      data-rarity={card.rarity}
      aria-hidden={facingAway}
      inert={facingAway ? true : undefined}
    >
      <div className="card__back">
        <div className="card__back-head">
          {avatarUrl ? (
            <Image
              className="card__avatar"
              src={avatarUrl}
              alt=""
              width={64}
              height={64}
            />
          ) : (
            <span className="card__avatar" aria-hidden="true">
              {initials(card.display_name)}
            </span>
          )}
          <span>
            <span className="card__name" style={{ color: "var(--color-ink)" }}>
              {card.display_name}
            </span>
            {card.school_or_work ? (
              <span
                className="card__affil"
                style={{ color: "var(--color-ink-soft)" }}
              >
                {card.school_or_work}
              </span>
            ) : null}
          </span>
        </div>

        <div className="card__qa">
          <span className="card__q">Explain your card</span>
          <span className="card__a">{card.explanation}</span>
        </div>

        {card.favorite_media ? (
          <div className="card__qa">
            <span className="card__q">On repeat</span>
            <span className="card__a">{card.favorite_media}</span>
          </div>
        ) : null}

        {/* Printed emblem, the way a real card back carries the set's mark. Also
            what stops the lower half reading as an accidental void. */}
        <div className="card__mark" aria-hidden="true">
          <span>{packName}</span>
        </div>

        <div className="card__back-foot">
          {card.social_url ? (
            // Rendered as text, not a link: the whole card is a flip button, and a
            // nested interactive element would be unreachable and invalid.
            <span style={{ color: "var(--color-pool-deep)" }}>
              {card.social_label ?? prettyUrl(card.social_url)}
            </span>
          ) : (
            <span style={{ color: "var(--color-ink-soft)" }}>{packName}</span>
          )}
          <span className="card__serial">{formatSerial(card.serial)}</span>
        </div>
      </div>

      {/* The back gets the same swept highlight as the front, so the light
          carries straight through the turn instead of stopping halfway. */}
      <div className="card__gloss" aria-hidden="true" />
    </div>
  );
}
