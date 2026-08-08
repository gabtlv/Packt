// Generates the placeholder portraits used by the seeded staff cards.
//
// These exist so the pool is never empty: the very first pack opened at a live
// event must not hit `pool_exhausted`. They are deliberately abstract duotone
// gradients rather than fake faces.
//
// PNG is encoded by hand (zlib + CRC32) so the repo needs no image dependency.
// Run with: node scripts/generate-seed-images.mjs

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "seed");
const W = 600;
const H = 840; // 5:7, matching the card's art window

// [from, to] duotone pairs, one per seeded card.
const PALETTES = [
  ["#0f172a", "#f59e0b"], ["#1e1b4b", "#22d3ee"], ["#2e1065", "#c084fc"],
  ["#4c0519", "#fb7185"], ["#14532d", "#a3e635"], ["#0c4a6e", "#38bdf8"],
  ["#431407", "#fdba74"], ["#134e4a", "#5eead4"], ["#1e1b4b", "#818cf8"],
  ["#500724", "#f472b6"], ["#052e16", "#4ade80"], ["#172554", "#93c5fd"],
];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor
  // Each scanline is prefixed with a filter byte (0 = none).
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = rgb(x, y);
      const p = rowStart + 1 + x * 3;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });

PALETTES.forEach(([fromHex, toHex], i) => {
  const from = hex(fromHex);
  const to = hex(toHex);
  // Angle and blob position vary per card so no two seeds look alike.
  const angle = (i / PALETTES.length) * Math.PI * 2;
  const cx = W * (0.5 + 0.16 * Math.cos(angle));
  const cy = H * (0.42 + 0.12 * Math.sin(angle));
  const radius = Math.min(W, H) * 0.34;

  const buf = png(W, H, (x, y) => {
    // Diagonal gradient as the base.
    const t = (x / W) * 0.45 + (y / H) * 0.55;
    let c = mix(from, to, t);

    // A soft luminous blob suggesting a portrait subject.
    const d = Math.hypot(x - cx, y - cy) / radius;
    if (d < 1) {
      const falloff = Math.pow(1 - d, 1.8);
      c = mix(c, to, falloff * 0.55);
    }

    // Faint scanlines so the placeholder reads as texture, not a flat fill.
    if (y % 6 === 0) c = c.map((v) => Math.max(0, v - 8));
    return c;
  });

  const name = String(i + 1).padStart(2, "0") + ".png";
  writeFileSync(join(OUT_DIR, name), buf);
  console.log(`seed/${name}  ${(buf.length / 1024).toFixed(1)} KB`);
});
