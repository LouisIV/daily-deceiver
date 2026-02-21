import type { Metadata } from "next";
import { getGrade } from "@/lib/game/grades";
import { decodeShareParam } from "@/lib/game/share-decode";
import { Game } from "./components/Game";

type Props = { searchParams: Promise<{ s?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { s } = await searchParams;
  const decoded = s ? decodeShareParam(s) : null;

  if (!decoded) return {};

  const { score, total } = decoded;
  const [grade] = getGrade(score);
  const title = `${score}/${total} — ${grade} | The Daily Deceiver`;
  const description = "Can you beat my score? A vintage newspaper clipping guessing game.";
  const imageUrl = `/api/og-share?s=${encodeURIComponent(s!)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function Page() {
  return <Game />;
}
