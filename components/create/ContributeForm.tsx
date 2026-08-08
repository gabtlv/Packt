"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/card/Card";
import { VARIANT_LABELS } from "@/lib/cards";
import type { BorderVariant, CardRow } from "@/lib/database.types";
import { PhotoTooLargeError, uploadCardPhoto } from "@/lib/images";
import { PROMPTS } from "@/lib/prompts";
import { BORDER_VARIANTS, contributeSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/client";

type Props = {
  slug: string;
  packName: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
};

type Fields = {
  border_variant: BorderVariant;
  school_or_work: string;
  favorite_media: string;
  social_url: string;
  prompt_1_key: string;
  prompt_1_answer: string;
  prompt_2_key: string;
  prompt_2_answer: string;
  fun_fact: string;
};

const INITIAL: Fields = {
  border_variant: "amber",
  school_or_work: "",
  favorite_media: "",
  social_url: "",
  prompt_1_key: PROMPTS[0].key,
  prompt_1_answer: "",
  prompt_2_key: PROMPTS[1].key,
  prompt_2_answer: "",
  fun_fact: "",
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
  displayName,
  avatarUrl,
}: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>(INITIAL);
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
      rarity: "common",
      display_name: displayName,
      school_or_work: fields.school_or_work || null,
      favorite_media: fields.favorite_media || null,
      social_label: null,
      social_url: fields.social_url || null,
      prompt_1_key: fields.prompt_1_key,
      prompt_1_answer: fields.prompt_1_answer || "…",
      prompt_2_key: fields.prompt_2_key,
      prompt_2_answer: fields.prompt_2_answer || "…",
      fun_fact: fields.fun_fact || "Your fun fact lands here.",
      created_at: new Date().toISOString(),
    }),
    [fields, displayName, userId],
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
        border_variant: fields.border_variant,
        school_or_work: fields.school_or_work,
        favorite_media: fields.favorite_media,
        social_label: null,
        social_url: fields.social_url,
        prompt_1_key: fields.prompt_1_key,
        prompt_1_answer: fields.prompt_1_answer,
        prompt_2_key: fields.prompt_2_key,
        prompt_2_answer: fields.prompt_2_answer,
        fun_fact: fields.fun_fact,
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

  const promptTwoOptions = PROMPTS.filter((p) => p.key !== fields.prompt_1_key);

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

        <div className="grid gap-4 sm:grid-cols-2">
          <PromptField
            index={1}
            options={PROMPTS}
            selectedKey={fields.prompt_1_key}
            answer={fields.prompt_1_answer}
            onKeyChange={(k) => set("prompt_1_key", k)}
            onAnswerChange={(v) => set("prompt_1_answer", v)}
          />
          <PromptField
            index={2}
            options={promptTwoOptions}
            selectedKey={fields.prompt_2_key}
            answer={fields.prompt_2_answer}
            onKeyChange={(k) => set("prompt_2_key", k)}
            onAnswerChange={(v) => set("prompt_2_answer", v)}
          />
        </div>

        <div className="field">
          <label htmlFor="fun_fact">One fun fact</label>
          <input
            id="fun_fact"
            value={fields.fun_fact}
            maxLength={160}
            onChange={(e) => set("fun_fact", e.target.value)}
            placeholder="I once ran a half marathon by accident. I got lost."
            required
          />
          <p className="field__hint">This is the flavour text on the card front.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="school_or_work">School or work</label>
            <input
              id="school_or_work"
              value={fields.school_or_work}
              maxLength={80}
              onChange={(e) => set("school_or_work", e.target.value)}
              placeholder="Georgia Tech"
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
            Your card joins the {packName} pool and earns you one pack.
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

function PromptField({
  index,
  options,
  selectedKey,
  answer,
  onKeyChange,
  onAnswerChange,
}: {
  index: number;
  options: readonly { key: string; label: string; placeholder: string }[];
  selectedKey: string;
  answer: string;
  onKeyChange: (key: string) => void;
  onAnswerChange: (value: string) => void;
}) {
  const selected = options.find((o) => o.key === selectedKey) ?? options[0];

  return (
    <div className="field">
      <label htmlFor={`prompt-${index}`}>Question {index}</label>
      <select
        id={`prompt-${index}`}
        value={selectedKey}
        onChange={(e) => onKeyChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        aria-label={`Answer to: ${selected?.label ?? ""}`}
        value={answer}
        maxLength={160}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder={selected?.placeholder}
        required
      />
    </div>
  );
}

function messageFor(code: unknown): string {
  switch (code) {
    case "already_contributed":
      return "You've already added a card to this set.";
    case "not_authenticated":
      return "Your session expired. Sign in again and retry.";
    case "invalid_card":
      return "Something in the form isn't right. Check the answers and try again.";
    default:
      return "Couldn't add your card. Try again in a moment.";
  }
}
