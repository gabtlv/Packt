import type { Metadata } from "next";
import { Archivo, Newsreader, Space_Mono } from "next/font/google";

import "./globals.css";

// Display: heavy and tight, the way a card set's logo is locked up.
const archivo = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "800"],
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
      className={`${archivo.variable} ${newsreader.variable} ${spaceMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
