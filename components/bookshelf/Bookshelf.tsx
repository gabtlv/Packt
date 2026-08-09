import type { CSSProperties } from "react";
import Link from "next/link";

import type { PackRow } from "@/lib/database.types";

type Props = {
  packs: PackRow[];
};

/**
 * Community binders as books on a shelf. Hover pulls one forward and shows its
 * details; click takes it off the shelf into the open binder.
 */
export function Bookshelf({ packs }: Props) {
  return (
    <div className="bookshelf">
      <ul className="bookshelf__row">
        {packs.map((pack, index) => (
          <li key={pack.id} className="bookshelf__slot">
            <Link
              href={`/packs/${pack.slug}`}
              className="shelf-binder"
              style={
                {
                  "--binder-accent": pack.accent,
                  "--binder-tilt": `${(index % 3) - 1}deg`,
                } as CSSProperties
              }
            >
              <span className="shelf-binder__spine">
                <span className="shelf-binder__band" aria-hidden="true" />
                <span className="shelf-binder__title">{pack.name}</span>
                <span className="shelf-binder__count">
                  {pack.card_count}
                </span>
              </span>

              <span className="shelf-binder__detail">
                <span className="shelf-binder__detail-name">{pack.name}</span>
                {pack.description ? (
                  <span className="shelf-binder__detail-copy">
                    {pack.description}
                  </span>
                ) : (
                  <span className="shelf-binder__detail-copy">
                    Open this binder and flip through the set.
                  </span>
                )}
                <span className="shelf-binder__detail-meta label">
                  {pack.card_count} card{pack.card_count === 1 ? "" : "s"} · Click To Open
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="bookshelf__plank" aria-hidden="true">
        <span className="bookshelf__plank-edge" />
      </div>
    </div>
  );
}
