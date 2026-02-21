import { ImageResponse } from "next/og";
import { paperTextureSvgString } from "../../../lib/paper-texture";
import { getGrade } from "../../../lib/game/grades";
import { decodeShareParam } from "../../../lib/game/share-decode";
import type { SharePaper } from "../../../lib/game/share";
import { NoPapersLayout } from "./layouts/no-papers";
import { OnePaperLayout } from "./layouts/one-paper";
import { TwoPapersLayout } from "./layouts/two-papers";

export const runtime = "nodejs";

async function loadGoogleFont(font: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(
    /src: url\((.+?)\) format\('(woff2|woff|opentype|truetype)'\)/,
  );
  if (resource) {
    const response = await fetch(resource[1]);
    if (response.status === 200) {
      return await response.arrayBuffer();
    }
  }
  throw new Error(`failed to load font: ${font}`);
}

async function getDailyPapers(): Promise<SharePaper[]> {
  try {
    const url = process.env.NEXT_PUBLIC_DAILY_GAME_URL;
    if (!url) return [];
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json() as { snippets?: { headline?: string; source?: string; imageUrl?: string }[] };
    if (!Array.isArray(data.snippets)) return [];
    return data.snippets.slice(0, 2).map((s) => ({
      headline: s.headline ?? "",
      source: s.source,
      imageUrl: s.imageUrl,
    }));
  } catch (err) {
    console.error("[og-share] getDailyPapers failed:", err);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const s = searchParams.get("s") ?? "";
  const decoded = decodeShareParam(s);
  const layout = decoded?.layout ?? 0;
  const score = decoded?.score ?? 0;
  const total = decoded?.total ?? 10;
  const [grade] = getGrade(score);

  const papers = layout > 0 ? await getDailyPapers() : [];

  const displayText =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,.?!'\"·- ";
  const textureUrl = `data:image/svg+xml;base64,${Buffer.from(
    paperTextureSvgString(),
  ).toString("base64")}`;
  const mastheadTextureUrl = `data:image/svg+xml;base64,${Buffer.from(
    paperTextureSvgString(1200, 200, 2),
  ).toString("base64")}`;

  const headlineBayer = {
    width: 1120,
    height: 72,
    gradientStartPercent: 50,
    gradientEndPercent: 85,
  };

  const [
    playfairFont,
    playfairFont900,
    unifrakturFont,
    imfellFont,
    girassolFont,
  ] = await Promise.all([
    loadGoogleFont("Playfair+Display:wght@700", displayText),
    loadGoogleFont("Playfair+Display:wght@900", displayText),
    loadGoogleFont("UnifrakturMaguntia", displayText),
    loadGoogleFont("IM+Fell+English", displayText),
    loadGoogleFont("Girassol", displayText),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#1c1008",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: "#f5ecd7",
          display: "flex",
          flexDirection: "column",
          fontFamily: '"IM Fell English", serif',
          padding: "24px 0 32px 0",
          boxSizing: "border-box",
          color: "#1c1008",
          overflow: "visible",
        }}
      >
        <img
          src={textureUrl}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0.18,
            mixBlendMode: "multiply",
          }}
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            paddingTop: 0,
            boxSizing: "border-box",
          }}
        >
          {layout === 2 && papers.length >= 2 ? (
            <TwoPapersLayout score={score} total={total} grade={grade} papers={[papers[0], papers[1]]} />
          ) : layout >= 1 && papers.length >= 1 ? (
            <OnePaperLayout score={score} total={total} grade={grade} paper={papers[0]} />
          ) : (
            <NoPapersLayout score={score} total={total} grade={grade} bayer={headlineBayer} />
          )}
        </div>

        {/* Masthead strip */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "162px",
            background: "#D5D5D5",
            display: "flex",
            boxShadow: "0 6px 20px rgba(28, 16, 8, 0.2), 0 2px 6px rgba(28, 16, 8, 0.12)",
            borderBottom: "2px solid #2a1a08",
          }}
        >
          <img
            src={mastheadTextureUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: 0.65,
              mixBlendMode: "multiply",
            }}
          />
        </div>

        {/* Dateline */}
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 8,
            right: 8,
            display: "flex",
            justifyContent: "space-between",
            fontSize: "16px",
            letterSpacing: "0.5px",
            opacity: 0.9,
            marginLeft: "16px",
            marginRight: "16px",
            transform: "translateY(20px)",
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px", border: "2px solid #2a1a08" }}>
            <span>THE DAILY</span>
            <span>DECEIVER</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px", border: "2px solid #2a1a08" }}>
            <span>RESULTS</span>
            <span>EDITION</span>
          </div>
        </div>

        {/* Masthead title */}
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 8,
            right: 8,
            textAlign: "center",
            paddingBottom: "8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "4px",
            transform: "translateY(-20px)",
          }}
        >
          <div
            style={{
              fontSize: "84px",
              fontFamily: '"UnifrakturMaguntia", serif',
              fontWeight: 400,
              margin: "0 0 4px 0",
              letterSpacing: "1px",
              lineHeight: 1,
            }}
          >
            The Daily Deceiver
          </div>
          <div
            style={{
              fontSize: "16px",
              letterSpacing: "2px",
              opacity: 0.75,
            }}
          >
            A TRIVIA GAME OF FACTS & FABRICATIONS
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Playfair Display", data: playfairFont, weight: 700, style: "normal" },
        { name: "Playfair Display", data: playfairFont900, weight: 900, style: "normal" },
        { name: "UnifrakturMaguntia", data: unifrakturFont, weight: 400, style: "normal" },
        { name: "IM Fell English", data: imfellFont, weight: 400, style: "normal" },
        { name: "Girassol", data: girassolFont, weight: 400, style: "normal" },
      ],
    },
  );
}
