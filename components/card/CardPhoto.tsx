import Image from "next/image";

import type { CardRow } from "@/lib/database.types";
import { resolvePhotoUrl } from "@/lib/images";

type Props = {
  card: CardRow;
  /** Grid cards load the small derivative; a featured card loads the full one. */
  size?: "thumb" | "full";
  priority?: boolean;
  /**
   * A local blob: URL, used by the contribute preview before anything is uploaded.
   * Bypasses storage resolution and image optimisation, which can't handle blobs.
   */
  photoUrl?: string;
};

/**
 * The uploaded photo, in whichever window a front puts it. Shared by both fronts
 * so the three states — live blob preview, stored photo, no photo yet — behave the
 * same whichever design you picked.
 */
export function CardPhoto({ card, size = "thumb", priority, photoUrl }: Props) {
  const path = size === "full" ? card.photo_path : card.thumb_path;

  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- blob: URLs can't be optimised
    return <img src={photoUrl} alt="" />;
  }

  if (path) {
    return (
      <Image
        src={resolvePhotoUrl(path)}
        alt={`${card.display_name}'s card photo`}
        width={size === "full" ? 1200 : 400}
        height={size === "full" ? 1680 : 560}
        // Phones show the sheet two-up, so a pocket card is ~46vw there.
        sizes={size === "full" ? "420px" : "(max-width: 640px) 46vw, 220px"}
        priority={priority}
      />
    );
  }

  // The contribute preview renders before a photo is chosen, so there is a real
  // state with no image path at all. Without this branch next/image gets an empty
  // src and throws.
  return <span className="card__art-empty">Your photo</span>;
}
