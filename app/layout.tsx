import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Caveat, IM_Fell_English, Playfair_Display, Playfair_Display_SC, UnifrakturMaguntia } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const playfairSC = Playfair_Display_SC({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair-sc",
});

const imFell = IM_Fell_English({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-im-fell",
});

const unifraktur = UnifrakturMaguntia({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-unifraktur",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-hand",
});

const siteBase = "https://newspaper-game.vercel.app";
const defaultOgImagePath =
  "/api/og?headline=Is%20It%20Real%20or%20Fake?&subtitle=A%2019th-Century%20Newspaper%20Trivia%20Game";

export const metadata: Metadata = {
  metadataBase: new URL(siteBase),
  title: "The Daily Deceiver",
  description: "Real or fake? A vintage newspaper clipping guessing game.",
  openGraph: {
    title: "Is It Real or Fake?",
    description: "A 19th-Century Newspaper Trivia Game",
    url: siteBase,
    type: "website",
    images: [
      {
        url: `${siteBase}${defaultOgImagePath}`,
        width: 1200,
        height: 630,
        alt: "The Daily Deceiver - Newspaper Guessing Game",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Is It Real or Fake?",
    description: "A 19th-Century Newspaper Trivia Game",
    images: [`${siteBase}${defaultOgImagePath}`],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${playfairSC.variable} ${imFell.variable} ${unifraktur.variable} ${caveat.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
