import { z } from "zod";

export const BORDER_VARIANTS = [
  "amber",
  "cyan",
  "violet",
  "rose",
  "lime",
  "slate",
] as const;

/**
 * The card fronts a contributor can choose between. Like BORDER_VARIANTS, this
 * has to stay in step with `CardDesign` in lib/database.types.ts and the
 * `.card__face--*` rules in app/globals.css.
 */
export const CARD_DESIGNS = ["sporty", "vintage"] as const;

/**
 * Storage paths this app produced: `{uid}/{uuid}/full.webp`. Validated so a
 * request cannot smuggle an arbitrary URL or a path traversal into `photo_path`,
 * which is later interpolated into a public storage URL.
 */
const storagePath = z
  .string()
  .min(1)
  .max(200)
  .regex(
    /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/(full|thumb)\.(webp|jpg|jpeg|png)$/,
    "must be a path this app uploaded",
  );

/** Empty / missing / null optional text → null for the DB. */
const trimmedOptional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

/** Shared by the contribute form and the POST route, so both agree on the rules. */
export const contributeSchema = z.object({
  photo_path: storagePath,
  thumb_path: storagePath,
  border_variant: z.enum(BORDER_VARIANTS),
  card_design: z.enum(CARD_DESIGNS),

  display_name: z.string().trim().min(1, "required").max(40),
  // Labelled "Location" in the form; the column name predates the rename.
  school_or_work: trimmedOptional(80),
  // The only question the form asks. Two lines' worth — long enough to say
  // something, short enough that the card back can still print it.
  explanation: z.string().trim().min(1, "required").max(200),
  favorite_media: trimmedOptional(80),
  social_label: trimmedOptional(24),
  social_url: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => {
      if (!v) return null;
      // People paste "github.com/you" — treat that as https.
      if (!/^https?:\/\//i.test(v)) return `https://${v}`;
      return v;
    })
    .refine(
      (v) => v === null || /^https?:\/\/.+/i.test(v),
      "must be a valid link",
    ),
});

export type ContributeInput = z.infer<typeof contributeSchema>;

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "required")
  .max(48)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "use lowercase letters, numbers, and hyphens",
  );

/** Admin-only: create a new event binder on the bookshelf. */
export const createPackSchema = z.object({
  name: z.string().trim().min(1, "required").max(60),
  slug: slugSchema,
  description: trimmedOptional(200),
  accent: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "use a hex colour like #f59e0b")
    .transform((v) => v.toLowerCase())
    .default("#f59e0b"),
});

export type CreatePackInput = z.infer<typeof createPackSchema>;

/** Derive a URL slug from a display name (`Summer Hacks` → `summer-hacks`). */
export function slugifyPackName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
