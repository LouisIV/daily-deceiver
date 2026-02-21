import { ImageResponse } from "next/og";
import { paperTextureSvgString } from "../../../lib/paper-texture";
import { decodeSharePayloadToken } from "../../../lib/game/share-server";
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

const ogShareSecret = process.env.OG_SHARE_SECRET;
const requireEncryption = process.env.NODE_ENV !== "development";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("h") ?? searchParams.get("hash") ?? "";
  const {
    score,
    total,
    grade,
    papers,
    texture: textureEnabled,
    textureIntensity,
    textureOpacity,
  } = decodeSharePayloadToken(hash, ogShareSecret, { requireEncryption });

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

        {/* Content area — papers extend from top so they sit under the masthead */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            paddingTop: 0,
            boxSizing: "border-box",
          }}
        >
          {papers.length === 0 && (
            <NoPapersLayout
              score={score}
              total={total}
              grade={grade}
              bayer={headlineBayer}
            />
          )}
          {papers.length === 1 && (
            <OnePaperLayout
              score={score}
              total={total}
              grade={grade}
              paper={papers[0]}
              textureEnabled={textureEnabled}
              textureIntensity={textureIntensity}
              textureOpacity={textureOpacity}
            />
          )}
          {papers.length >= 2 && (
            <TwoPapersLayout
              score={score}
              total={total}
              grade={grade}
              papers={[papers[0], papers[1]]}
              textureEnabled={textureEnabled}
              textureIntensity={textureIntensity}
              textureOpacity={textureOpacity}
            />
          )}
        </div>

        {/* Masthead strip — full-width #D5D5D5 with strong paper texture */}
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

        {/* Dateline — on top of strip */}
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

        {/* Masthead — on top of strip */}
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
        {
          name: "Playfair Display",
          data: playfairFont,
          weight: 700,
          style: "normal",
        },
        {
          name: "Playfair Display",
          data: playfairFont900,
          weight: 900,
          style: "normal",
        },
        {
          name: "UnifrakturMaguntia",
          data: unifrakturFont,
          weight: 400,
          style: "normal",
        },
        {
          name: "IM Fell English",
          data: imfellFont,
          weight: 400,
          style: "normal",
        },
        { name: "Girassol", data: girassolFont, weight: 400, style: "normal" },
      ],
    },
  );
}
