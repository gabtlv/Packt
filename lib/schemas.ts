import { z } from "zod";

import { PROMPT_KEYS } from "@/lib/prompts";

export const BORDER_VARIANTS = [
  "amber",
  "cyan",
  "violet",
  "rose",
  "lime",
  "slate",
] as const;

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

const trimmedOptional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/** Shared by the contribute form and the POST route, so both agree on the rules. */
export const contributeSchema = z
  .object({
    photo_path: storagePath,
    thumb_path: storagePath,
    border_variant: z.enum(BORDER_VARIANTS),

    school_or_work: trimmedOptional(80),
    favorite_media: trimmedOptional(80),
    social_label: trimmedOptional(24),
    social_url: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : null))
      .refine(
        (v) => v === null || /^https?:\/\/.+/.test(v),
        "must start with http:// or https://",
      ),

    prompt_1_key: z.enum(PROMPT_KEYS),
    prompt_1_answer: z.string().trim().min(1, "required").max(160),
    prompt_2_key: z.enum(PROMPT_KEYS),
    prompt_2_answer: z.string().trim().min(1, "required").max(160),
    fun_fact: z.string().trim().min(1, "required").max(160),
  })
  .refine((v) => v.prompt_1_key !== v.prompt_2_key, {
    message: "pick two different prompts",
    path: ["prompt_2_key"],
  });

export type ContributeInput = z.infer<typeof contributeSchema>;
