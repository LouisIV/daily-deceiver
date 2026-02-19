import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
