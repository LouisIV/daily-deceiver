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

export const metadata: Metadata = {
  metadataBase: new URL('https://newspaper-game.vercel.app'),
  title: "The Daily Deceiver",
  description: "Real or fake? A vintage newspaper clipping guessing game.",
  openGraph: {
    title: "Is It Real or Fake?",
    description: "A 19th-Century Newspaper Trivia Game",
    url: "https://newspaper-game.vercel.app",
    type: "website",
    images: [
      {
        url: "/api/og?headline=Is%20It%20Real%20or%20Fake?&subtitle=A%2019th-Century%20Newspaper%20Trivia%20Game",
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
    images: [
      "/api/og?headline=Is%20It%20Real%20or%20Fake?&subtitle=A%2019th-Century%20Newspaper%20Trivia%20Game",
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${playfairSC.variable} ${imFell.variable} ${unifraktur.variable} ${caveat.variable}`}
    >
      <body>
        {/* Demo-style: turbulence + displacement (edge only when applied to paper layer) */}
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" height="0" width="0" aria-hidden>
          <defs>
            <filter
              id="squiggle"
              x="-15%"
              y="-15%"
              width="130%"
              height="130%"
              filterUnits="objectBoundingBox"
            >
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={4} result="turbulence" />
              <feDisplacementMap in="SourceGraphic" in2="turbulence" scale={4} xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <clipPath id="paper-edge" clipPathUnits="objectBoundingBox">
              <path d="M 0.012,0.02 L 0.08,0.018 L 0.16,0.022 L 0.24,0.018 L 0.32,0.021 L 0.4,0.019 L 0.48,0.022 L 0.56,0.018 L 0.64,0.02 L 0.72,0.021 L 0.8,0.019 L 0.88,0.022 L 0.988,0.02 L 0.982,0.08 L 0.985,0.16 L 0.98,0.24 L 0.983,0.32 L 0.981,0.4 L 0.978,0.48 L 0.982,0.56 L 0.98,0.64 L 0.981,0.72 L 0.979,0.8 L 0.983,0.88 L 0.98,0.988 L 0.88,0.982 L 0.8,0.98 L 0.72,0.981 L 0.64,0.979 L 0.56,0.983 L 0.48,0.98 L 0.4,0.982 L 0.32,0.979 L 0.24,0.98 L 0.16,0.981 L 0.08,0.979 L 0.02,0.988 L 0.018,0.88 L 0.022,0.8 L 0.019,0.72 L 0.021,0.64 L 0.018,0.56 L 0.022,0.48 L 0.02,0.4 L 0.021,0.32 L 0.019,0.24 L 0.022,0.16 L 0.018,0.08 Z" />
            </clipPath>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  );
}
