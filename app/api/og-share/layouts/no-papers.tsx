import { DatabendEffect, type BayerOverlayOptions } from "../../../../lib/og-databend";

const DEFAULT_BACKGROUND_PAPER_URL =
  "https://tile.loc.gov/image-services/iiif/service:ndnp:nbu:batch_nbu_alliance_ver01:data:sn99021999:0020653882A:1892021501:0214/full/1600,/0/default.jpg";

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
    <div
      style={{
        flex: 1,
        display: "flex",
        overflow: "visible",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Default paper image — first so it renders behind; same pattern as one-paper */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
          opacity: 0.5,
          display: "flex",
        }}
      >
        <img
          src={DEFAULT_BACKGROUND_PAPER_URL}
          width={1200}
          height={630}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "280%",
            height: "280%",
            objectFit: "cover",
            objectPosition: "center center",
            transform: "translate(-50%, -70%) rotate(90deg)",
          }}
        />
      </div>

      {/* Score card — paper card on top, same style as one-paper/two-papers */}
      <div
        style={{
          position: "relative",
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
          transform: "rotate(-2deg) translateY(60px)",
          maxWidth: "520px",
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
    </div>
  );
}
