"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/card/Card";
import { CardFront } from "@/components/card/CardFront";
import { CARD_DESIGN_LABELS, VARIANT_LABELS, variantStyle } from "@/lib/cards";
import type { BorderVariant, CardDesign, CardRow } from "@/lib/database.types";
import { PhotoTooLargeError, uploadCardPhoto } from "@/lib/images";
import { BORDER_VARIANTS, CARD_DESIGNS, contributeSchema } from "@/lib/schemas";
import { MAX_CARDS_PER_PACK } from "@/lib/services/packs";
import { createClient } from "@/lib/supabase/client";

type Props = {
  slug: string;
  packName: string;
  userId: string;
  /** Prefill only — the member can change the name shown on their card. */
  suggestedName: string;
  avatarUrl: string | null;
  contributionCount: number;
};

type Fields = {
  display_name: string;
  card_design: CardDesign;
  border_variant: BorderVariant;
  /** Labelled "Location" — the column name predates the rename. */
  school_or_work: string;
  explanation: string;
  favorite_media: string;
  social_url: string;
};

/**
 * One screen, not a wizard. The PRD's target is a card contributed in under sixty
 * seconds, and a live preview beside a single short form gets there faster than
 * stepping through five panels — you can see the card you're making as you type.
 */
export function ContributeForm({
  slug,
  packName,
  userId,
  suggestedName,
  avatarUrl,
  contributionCount,
}: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>(() => ({
    display_name: suggestedName,
    card_design: "sporty",
    border_variant: "amber",
    school_or_work: "",
    explanation: "",
    favorite_media: "",
    social_url: "",
  }));
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const liveUrl = useRef<string | null>(null);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) =>
    setFields((f) => ({ ...f, [key]: value }));

  /**
   * The preview URL is derived from the chosen file, so it's created here rather
   * than in an effect. Each object URL must be revoked or the browser keeps the
   * whole photo alive in memory.
   */
  function pickPhoto(next: File | null) {
    if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
    liveUrl.current = next ? URL.createObjectURL(next) : null;
    setPhoto(next && liveUrl.current ? { file: next, url: liveUrl.current } : null);
  }

  useEffect(() => {
    // Release the last preview when leaving the page.
    return () => {
      if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
    };
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const previewCard = useMemo<CardRow>(
    () => ({
      id: "preview",
      pack_id: "preview",
      owner_id: userId,
      serial: 0,
      photo_path: "",
      thumb_path: "",
      border_variant: fields.border_variant,
      card_design: fields.card_design,
      rarity: "common",
      display_name: fields.display_name || "Your name",
      school_or_work: fields.school_or_work || "Your location",
      explanation: fields.explanation || "What your card is about.",
      favorite_media: fields.favorite_media || null,
      social_label: null,
      social_url: fields.social_url || null,
      // Retired by migration 0009; nothing reads them, but the row type still
      // describes what the table returns.
      prompt_1_key: null,
      prompt_1_answer: null,
      prompt_2_key: null,
      prompt_2_answer: null,
      fun_fact: null,
      created_at: new Date().toISOString(),
    }),
    [fields, userId],
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!photo) {
      setError("Add a photo first — it's the front of your card.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const paths = await uploadCardPhoto(supabase, userId, photo.file);

      const parsed = contributeSchema.safeParse({
        ...paths,
        display_name: fields.display_name,
        card_design: fields.card_design,
        border_variant: fields.border_variant,
        school_or_work: fields.school_or_work,
        explanation: fields.explanation,
        favorite_media: fields.favorite_media,
        social_url: fields.social_url,
      });

      if (!parsed.success) {
        const first = parsed.error.issues[0];
        setError(first?.message ?? "Something in the form isn't right.");
        return;
      }

      const response = await fetch(`/api/packs/${slug}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(messageFor(body.error));
        return;
      }

      // They've just earned a pack. Send them straight to opening it.
      router.push(`/packs/${slug}/open`);
    } catch (cause) {
      setError(
        cause instanceof PhotoTooLargeError
          ? cause.message
          : "Couldn't add your card. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <form onSubmit={onSubmit} className="grid gap-6" noValidate>
        {error ? (
          <p
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="field__error rounded border border-stamp px-3 py-2"
          >
            {error}
          </p>
        ) : null}

        <div className="field">
          <label htmlFor="photo">Your photo</label>
          <input
            id="photo"
            type="file"
            // `capture` gives phones the camera as well as the camera roll.
            accept="image/*"
            capture="environment"
            onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
            required
          />
          <p className="field__hint">
            Resized in your browser before upload, so it stays small.
          </p>
        </div>

        <div className="field">
          <label htmlFor="display_name">Name</label>
          <input
            id="display_name"
            value={fields.display_name}
            maxLength={40}
            onChange={(e) => set("display_name", e.target.value)}
            placeholder="Alex"
            autoComplete="nickname"
            required
          />
          <p className="field__hint">
            Shown on the front and back. Whatever you go by — it doesn&apos;t
            have to match your Google account.
          </p>
        </div>

        <fieldset className="field">
          <legend className="field__label">Design</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {CARD_DESIGNS.map((design) => (
              <label key={design} className="cursor-pointer">
                <input
                  type="radio"
                  name="card_design"
                  value={design}
                  checked={fields.card_design === design}
                  onChange={() => set("card_design", design)}
                  className="sr-only"
                />
                <span
                  className="design-choice"
                  data-selected={fields.card_design === design}
                >
                  <span
                    className="design-choice__preview"
                    style={variantStyle(fields.border_variant)}
                  >
                    <span className="card">
                      <CardFront
                        card={{ ...previewCard, card_design: design }}
                        photoUrl={photo?.url}
                      />
                    </span>
                  </span>
                  <span className="design-choice__label">
                    {CARD_DESIGN_LABELS[design]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">Border</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {BORDER_VARIANTS.map((variant) => (
              <label key={variant} className="cursor-pointer">
                <input
                  type="radio"
                  name="border_variant"
                  value={variant}
                  checked={fields.border_variant === variant}
                  onChange={() => set("border_variant", variant)}
                  className="sr-only"
                />
                <span
                  className="swatch"
                  data-selected={fields.border_variant === variant}
                  style={{ backgroundColor: `var(--variant-${variant})` }}
                >
                  <span className="sr-only">{VARIANT_LABELS[variant]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="explanation">Explain your card:</label>
          <textarea
            id="explanation"
            rows={3}
            value={fields.explanation}
            maxLength={200}
            onChange={(e) => set("explanation", e.target.value)}
            placeholder="Taken thirty seconds before I fell in. Worth it."
            required
          />
          <p className="field__hint">
            The only question we ask. It&apos;s printed on the back of your card.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="school_or_work">Location</label>
            <input
              id="school_or_work"
              value={fields.school_or_work}
              maxLength={80}
              onChange={(e) => set("school_or_work", e.target.value)}
              placeholder="Atlanta, GA"
            />
          </div>

          <div className="field">
            <label htmlFor="favorite_media">On repeat</label>
            <input
              id="favorite_media"
              value={fields.favorite_media}
              maxLength={80}
              onChange={(e) => set("favorite_media", e.target.value)}
              placeholder="Kentucky Route Zero"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="social_url">One link</label>
          <input
            id="social_url"
            type="url"
            inputMode="url"
            value={fields.social_url}
            maxLength={200}
            onChange={(e) => set("social_url", e.target.value)}
            placeholder="https://github.com/you"
          />
          <p className="field__hint">
            Shown on the back of your card. Everything here is public — leave it out
            if you&apos;d rather not share it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn btn--accent" disabled={submitting}>
            {submitting ? "Adding your card…" : "Add card and open a pack"}
          </button>
          <p className="field__hint">
            Joins the {packName} pool and earns you one pack (
            {contributionCount + 1} of {MAX_CARDS_PER_PACK} for this set).
          </p>
        </div>
      </form>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <p className="label mb-3 text-ink-soft">Live preview · click to flip</p>
        <Card
          card={previewCard}
          packName={packName}
          avatarUrl={avatarUrl}
          photoUrl={photo?.url}
        />
        {!photo ? (
          <p className="field__hint mt-3">
            Add a photo to see the front fill in.
          </p>
        ) : null}
      </aside>
    </div>
  );
}

function messageFor(code: unknown): string {
  switch (code) {
    case "contribution_limit":
      return `You've added the maximum of ${MAX_CARDS_PER_PACK} cards to this set.`;
    case "not_authenticated":
      return "Your session expired. Sign in again and retry.";
    case "invalid_card":
      return "Something in the form isn't right. Check the answers and try again.";
    default:
      return "Couldn't add your card. Try again in a moment.";
  }
}
