"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createPackSchema, slugifyPackName } from "@/lib/schemas";

const ACCENTS = [
  "#f59e0b",
  "#2ec4d6",
  "#9b7bf0",
  "#f0708f",
  "#a9d143",
  "#94a3b8",
] as const;

/**
 * Admin-only form for putting a new event binder on the bookshelf.
 */
export function CreatePackForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState<string>(ACCENTS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched) setSlug(slugifyPackName(name));
  }, [name, slugTouched]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = createPackSchema.safeParse({
      name,
      slug,
      description,
      accent,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setError(first?.message ?? "Check the form and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(messageFor(body.error));
        return;
      }

      const body = (await response.json()) as { pack: { slug: string } };
      router.push(`/packs/${body.pack.slug}/about`);
      router.refresh();
    } catch {
      setError("Couldn't create that binder. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="create-pack grid gap-5" noValidate>
      <div>
        <p className="label text-ink-soft">Organizer</p>
        <h2 className="display mt-1 text-2xl">New event binder</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Creates an empty set on the bookshelf for people to fill with cards
          from the event.
        </p>
      </div>

      {error ? (
        <p role="alert" className="field__error rounded border border-stamp px-3 py-2">
          {error}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="pack-name">Event name</label>
        <input
          id="pack-name"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="SummerHacks"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="pack-slug">URL slug</label>
        <input
          id="pack-slug"
          value={slug}
          maxLength={48}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase());
          }}
          placeholder="summerhacks"
          required
        />
        <p className="field__hint">
          Lives at /packs/{slug || "…"} — lowercase, hyphens ok.
        </p>
      </div>

      <div className="field">
        <label htmlFor="pack-description">Short description</label>
        <input
          id="pack-description"
          value={description}
          maxLength={200}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="The summer cohort. Add your card, then open a pack."
        />
      </div>

      <fieldset className="field">
        <legend className="field__label">Spine colour</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {ACCENTS.map((color) => (
            <label key={color} className="cursor-pointer">
              <input
                type="radio"
                name="accent"
                value={color}
                checked={accent === color}
                onChange={() => setAccent(color)}
                className="sr-only"
              />
              <span
                className="swatch"
                data-selected={accent === color}
                style={{ backgroundColor: color }}
              >
                <span className="sr-only">{color}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" className="btn btn--accent" disabled={submitting}>
        {submitting ? "Creating…" : "Put it on the shelf"}
      </button>
    </form>
  );
}

function messageFor(code: unknown): string {
  switch (code) {
    case "not_admin":
      return "Your account isn't on the organizer list.";
    case "not_authenticated":
      return "Sign in with your organizer Google account first.";
    case "slug_taken":
      return "That URL slug is already used. Pick another.";
    case "invalid_pack":
      return "Check the name and slug, then try again.";
    default:
      return "Couldn't create that binder. Try again in a moment.";
  }
}
