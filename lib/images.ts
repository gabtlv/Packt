import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

export const BUCKET = "card-photos";

/** Longest-edge targets. Full is what the card shows; thumb is what the grid shows. */
const FULL_EDGE = 1200;
const THUMB_EDGE = 400;
const QUALITY = 0.82;

/**
 * Resolves a stored `photo_path` to something an <img> can load.
 *
 * Seeded staff cards use paths beginning `seed/`, which live in public/ and need
 * no upload. Everything else is a Supabase Storage object.
 */
export function resolvePhotoUrl(path: string): string {
  if (path.startsWith("seed/")) return `/${path}`;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

type Derivative = { blob: Blob; ext: string };

function drawScaled(
  bitmap: ImageBitmap,
  maxEdge: number,
): { canvas: HTMLCanvasElement | OffscreenCanvas; width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement("canvas"), { width, height });

  const ctx = canvas.getContext("2d") as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error("canvas_unavailable");

  ctx.drawImage(bitmap, 0, 0, width, height);
  return { canvas, width, height };
}

async function toBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
): Promise<Derivative> {
  if (canvas instanceof OffscreenCanvas) {
    const blob = await canvas.convertToBlob({ type: "image/webp", quality: QUALITY });
    return { blob, ext: "webp" };
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALITY),
  );
  if (blob && blob.type === "image/webp") return { blob, ext: "webp" };

  // Very old Safari can't encode WebP; JPEG keeps sizes in the same ballpark.
  const jpeg = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!jpeg) throw new Error("encode_failed");
  return { blob: jpeg, ext: "jpg" };
}

export class PhotoTooLargeError extends Error {
  constructor() {
    super(
      "That photo couldn't be resized in your browser. Try a JPEG or PNG instead of HEIC.",
    );
    this.name = "PhotoTooLargeError";
  }
}

/**
 * Produces the two derivatives uploaded for every card.
 *
 * Downscaling here is not an optimisation — it is what keeps the project inside
 * the Supabase free tier's 1 GB of storage. Straight-from-the-phone photos are
 * 3-5 MB, which would cap an entire event at roughly 250 cards.
 *
 * `imageOrientation: "from-image"` is required: without it, phone photos carrying
 * EXIF rotation are drawn sideways onto every card.
 */
export async function processPhoto(
  file: File,
): Promise<{ full: Derivative; thumb: Derivative }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Most often HEIC from an iPhone on a browser that can't decode it.
    throw new PhotoTooLargeError();
  }

  try {
    const full = await toBlob(drawScaled(bitmap, FULL_EDGE).canvas);
    const thumb = await toBlob(drawScaled(bitmap, THUMB_EDGE).canvas);
    return { full, thumb };
  } finally {
    bitmap.close();
  }
}

/**
 * Uploads both derivatives under `{uid}/{uuid}/`. The uid prefix is what the
 * storage RLS policy checks, so members cannot write into each other's folders.
 */
export async function uploadCardPhoto(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
): Promise<{ photo_path: string; thumb_path: string }> {
  const { full, thumb } = await processPhoto(file);
  const folder = `${userId}/${crypto.randomUUID()}`;

  const uploads = await Promise.all(
    [
      { path: `${folder}/full.${full.ext}`, blob: full.blob },
      { path: `${folder}/thumb.${thumb.ext}`, blob: thumb.blob },
    ].map(async ({ path, blob }) => {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) throw error;
      return path;
    }),
  );

  return { photo_path: uploads[0], thumb_path: uploads[1] };
}
