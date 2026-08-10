import type { Metadata } from "next";
import { Alfa_Slab_One, Archivo, Newsreader, Space_Mono } from "next/font/google";

import "./globals.css";

// Display: heavy and tight, the way a card set's logo is locked up.
//
// Loaded as the variable font rather than a set of static cuts, because the
// Sporty and Vintage card fronts need Archivo Black and Archivo Narrow — which
// are font-weight: 900 and font-stretch: 62% on the wdth axis, and `axes` is only
// allowed when no static weights are pinned. One file instead of four, and the
// fronts cost no extra download.
const archivo = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["wdth"],
});

// The Vintage front's headline, and the only thing on the site set in a slab.
const alfaSlabOne = Alfa_Slab_One({
  variable: "--font-slab",
  subsets: ["latin"],
  weight: "400",
});

// Body: card backs have always used a small warm serif for flavour text.
const newsreader = Newsreader({
  variable: "--font-body",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// Utility: serials, set codes, counts. Stamped, not typeset.
const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Packt",
  description:
    "Make a trading card about yourself, add it to the pool, and open a pack to meet someone else in the cohort.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Extensions (LanguageTool, Grammarly) stamp attributes on <html> before hydration.
      suppressHydrationWarning
      className={`${archivo.variable} ${alfaSlabOne.variable} ${newsreader.variable} ${spaceMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
