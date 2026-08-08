import type { CSSProperties } from "react";

import type { BorderVariant, CardRow } from "@/lib/database.types";

/**
 * Maps a card's chosen border variant onto the two custom properties the card CSS
 * reads: the mat colour and the darker rule/keyline drawn against it.
 */
export function variantStyle(variant: BorderVariant): CSSProperties {
  return {
    ["--variant" as string]: `var(--variant-${variant})`,
    ["--variant-deep" as string]: `var(--variant-${variant}-deep)`,
  };
}

export const VARIANT_LABELS: Record<BorderVariant, string> = {
  amber: "Amber",
  cyan: "Pool",
  violet: "Violet",
  rose: "Rose",
  lime: "Lime",
  slate: "Slate",
};

/**
 * `#004` — zero-padded so serials line up in a column. Serial 0 only occurs in the
 * contribute preview, where no number has been assigned yet.
 */
export function formatSerial(serial: number): string {
  if (serial <= 0) return "#NEW";
  return `#${String(serial).padStart(3, "0")}`;
}

/** Initials for the avatar fallback when a member has no Google photo. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Strips the scheme so a social link reads as a handle rather than a URL. */
export function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export type CardWithMeta = CardRow & {
  /** True when the viewing member contributed or pulled this card. */
  mine?: boolean;
};
