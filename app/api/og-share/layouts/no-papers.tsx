import { DatabendEffect, DatabendHeadline, type BayerOverlayOptions } from "../../../../lib/og-databend";

export function NoPapersLayout({
  score,
  total,
  grade,
  bayer,
}: {
  score: number;
  total: number;
  grade: string;
  bayer?: BayerOverlayOptions;
}) {
  return (
    <>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            fontSize: "18px",
            letterSpacing: "3px",
            fontFamily: '"Playfair Display", serif',
            fontWeight: 700,
            display: "flex",
          }}
        >
          FINAL SCORE
        </div>
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
        <div style={{ height: "1px", width: "80px", background: "#2a1a08", opacity: 0.3 }} />
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
    </>
  );
}
