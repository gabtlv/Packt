"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card } from "@/components/card/Card";
import { prettyUrl } from "@/lib/cards";
import type { CardRow } from "@/lib/database.types";
import { DRAW_MESSAGES, type DrawFailure } from "@/lib/services/draw";

type Props = {
  slug: string;
  packName: string;
  packAccent: string;
  unopenedPacks: number;
};

type Phase = "sealed" | "tearing" | "revealed" | "failed";

/**
 * Minimum time the tear animation is on screen, so the reveal lands as a beat.
 * Covers the shake plus the two halves of the wrapper clearing the viewport —
 * see the `pack-shake` / `pack-crown-lift` / `pack-body-drop` keyframes.
 */
const TEAR_MS = 1500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function PackOpening({
  slug,
  packName,
  packAccent,
  unopenedPacks,
}: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("sealed");
  const [card, setCard] = useState<CardRow | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [failure, setFailure] = useState<DrawFailure>("unknown");
  const [remaining, setRemaining] = useState(unopenedPacks);

  async function open() {
    setPhase("tearing");

    // Tear immediately so the click feels answered, but hold the reveal until the
    // request lands. Racing them means a slow network never shows a torn-open pack
    // with nothing inside.
    const [response] = await Promise.all([
      fetch(`/api/packs/${slug}/open`, { method: "POST" }).catch(() => null),
      wait(TEAR_MS),
    ]);

    if (!response) {
      setFailure("unknown");
      setPhase("failed");
      return;
    }

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setFailure((body.error as DrawFailure) ?? "unknown");
      setPhase("failed");
      return;
    }

    setCard(body.card as CardRow);
    setAvatarUrl(body.avatarUrl ?? null);
    setRemaining((n) => Math.max(0, n - 1));
    setPhase("revealed");
    // The binder now contains this pull; make sure it shows on next visit.
    router.refresh();
  }

  if (phase === "revealed" && card) {
    return (
      <div className="reveal">
        <p className="label text-pool">You pulled</p>
        <h1 className="display mt-2 text-4xl">{card.display_name}</h1>

        <div className="reveal__card">
          <Card
            card={card}
            packName={packName}
            avatarUrl={avatarUrl}
            size="full"
            priority
          />
        </div>

        {/* The card itself can't hold a link — it's a flip control — so the way to
            actually reach this person lives here. */}
        {card.social_url ? (
          <a
            className="btn btn--quiet mt-2"
            href={card.social_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {card.social_label ?? prettyUrl(card.social_url)} ↗
          </a>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {remaining > 0 ? (
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => {
                setCard(null);
                setPhase("sealed");
              }}
            >
              Open another ({remaining})
            </button>
          ) : null}
          <Link className="btn" href={`/packs/${slug}?collector=me`}>
            See it in the binder
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="reveal">
        <h1 className="display text-3xl">Nothing to open</h1>
        <p role="alert" className="mx-auto mt-3 max-w-sm text-sleeve">
          {DRAW_MESSAGES[failure]}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {failure === "no_unopened_pack" ? (
            <Link className="btn btn--accent" href={`/packs/${slug}/contribute`}>
              Add your card
            </Link>
          ) : null}
          <Link className="btn" href={`/packs/${slug}`}>
            Back to the binder
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reveal">
      <p className="label text-pool">{packName}</p>
      <h1 className="display mt-2 text-4xl">
        {remaining > 1 ? `${remaining} packs waiting` : "One pack waiting"}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-sleeve">
        One card from the pool, never your own and never one you already hold.
      </p>

      <button
        type="button"
        className="foilpack"
        data-tearing={phase === "tearing"}
        disabled={phase === "tearing"}
        onClick={open}
        style={{ ["--pack-accent" as string]: packAccent }}
      >
        {/* Two pieces of one wrapper. They overlap along a ragged seam while
            sealed — same foil, same box — so the pack reads as solid until the
            tear pulls the crown up and lets the body fall away. */}
        <span className="foilpack__piece foilpack__piece--body" aria-hidden="true">
          <span className="foilpack__sheen" />
          <span className="foilpack__torn" />
        </span>
        <span className="foilpack__piece foilpack__piece--crown" aria-hidden="true">
          <span className="foilpack__sheen" />
        </span>
        <span className="foilpack__burst" aria-hidden="true" />

        <span className="foilpack__label">
          <span className="foilpack__wordmark">{packName}</span>
          <span className="foilpack__hint">
            {phase === "tearing" ? "Opening…" : "Tear it open"}
          </span>
        </span>
      </button>

      <p aria-live="polite" className="sr-only">
        {phase === "tearing" ? "Opening your pack" : ""}
      </p>
    </div>
  );
}
