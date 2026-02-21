import type { SharePaper } from "../../../../lib/game/share";
import { PaperImage } from "./paper-image";

export function TwoPapersLayout({
  score,
  total,
  grade,
  papers,
}: {
  score: number;
  total: number;
  grade: string;
  papers: [SharePaper, SharePaper];
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Papers first so they render behind (Satori uses DOM order, not z-index) */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          gap: "4px",
          transform: "translateY(-40px)",
          marginLeft: "-60px",
          marginRight: "-60px",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            background: "#e8dfc4",
            overflow: "visible",
            alignItems: "flex-start",
            transform: "rotate(-3deg)",
            height: "100%",
          }}
        >
          <PaperImage
            paper={papers[0]}
          />
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            background: "#e8dfc4",
            overflow: "visible",
            alignItems: "flex-start",
            transform: "rotate(7deg)",
            height: "100%",
          }}
        >
          <PaperImage
            paper={papers[1]}
          />
        </div>
      </div>

      {/* Score card last so it renders on top */}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: "28px",
            padding: "24px 44px",
            background: "#f0e9d8",
            border: "3px solid #d4c9a8",
            borderRadius: "6px",
            boxShadow: "3px 6px 16px rgba(28, 16, 8, 0.2), 0 2px 4px rgba(28, 16, 8, 0.1)",
            transform: "rotate(-2deg)",
            maxWidth: "520px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: '"UnifrakturMaguntia", serif',
              fontSize: "80px",
              lineHeight: 1,
              color: "#1c1008",
              alignItems: "baseline",
            }}
          >
            {score}
            <span style={{ fontSize: "0.4em", opacity: 0.45 }}>/{total}</span>
          </div>
          <div style={{ width: "2px", height: "60px", background: "#2a1a08", opacity: 0.3 }} />
          <div
            style={{
              display: "flex",
              fontFamily: '"Playfair Display", serif',
              fontWeight: 900,
              fontSize: "26px",
              letterSpacing: "4px",
            }}
          >
            {grade}
          </div>
        </div>
      </div>
    </div>
  );
}
