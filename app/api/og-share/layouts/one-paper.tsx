import { DatabendEffect } from "@/lib/og-databend";
import type { SharePaper } from "../../../../lib/game/share";
import { PaperImage } from "./paper-image";

export function OnePaperLayout({
  score,
  total,
  grade,
  paper,
  textureEnabled = true,
  textureIntensity,
  textureOpacity,
}: {
  score: number;
  total: number;
  grade: string;
  paper: SharePaper;
  textureEnabled?: boolean;
  textureIntensity?: number;
  textureOpacity?: number;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "row",
        gap: "20px",
        alignItems: "stretch",
      }}
    >
      {/* Paper image — top-cropped via natural height + overflow:hidden */}
      <div
        style={{
          flex: "0 0 54%",
          display: "flex",
          background: "#e8dfc4",
          overflow: "hidden",
          alignItems: "flex-start",
          rotate: "0.5deg",
        }}
      >
        <PaperImage
          paper={paper}
          fallbackFontSize={18}
          textureEnabled={textureEnabled}
          textureIntensity={textureIntensity}
          textureOpacity={textureOpacity}
        />
      </div>

      <div style={{ width: "1px", background: "#2a1a08", opacity: 0.2 }} />

      {/* Score card — paper card with glitch score */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: "10px",
            padding: "24px 44px",
            background: "#f0e9d8",
            border: "3px solid #d4c9a8",
            borderRadius: "6px",
            boxShadow:
              "3px 6px 16px rgba(28, 16, 8, 0.2), 0 2px 4px rgba(28, 16, 8, 0.1)",
            transform: "rotate(-2deg)",
            maxWidth: "520px",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <DatabendEffect
              intensity={4}
              style={{
                fontFamily: '"UnifrakturMaguntia", serif',
                fontSize: "200px",
                lineHeight: 1,
                color: "#1c1008",
              }}
              bayer={{
                width: 120,
                height: 140,
                gradientStartPercent: 10,
                gradientEndPercent: 80,
                fillColor: "#f5ecd7",
                patternSize: 2,
              }}
            >
              {score}
            </DatabendEffect>
            <span
              style={{
                fontFamily: '"UnifrakturMaguntia", serif',
                fontSize: "52px",
                opacity: 0.45,
              }}
            >
              /{total}
            </span>
          </div>
          <div
            style={{
              height: "1px",
              width: "80px",
              background: "#2a1a08",
              opacity: 0.3,
            }}
          />
          <div
            style={{
              display: "flex",
              fontFamily: '"Playfair Display", serif',
              fontWeight: 900,
              fontSize: "32px",
              letterSpacing: "3px",
              textAlign: "center",
            }}
          >
            {grade}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: '"IM Fell English", serif',
              fontSize: "22px",
              fontStyle: "italic",
              opacity: 0.65,
            }}
          >
            Share your score.
          </div>
        </div>
      </div>
    </div>
  );
}
