"use client";

import type { Answered, Round } from "@/lib/game/types";
import { Clipping } from "./Clipping";
import { NewsButton } from "./NewsButton";
import { StampButton } from "./StampButton";

export function PlayScreen({
  snippet,
  current,
  total,
  answered,
  guess,
  next,
}: {
  snippet: Round;
  current: number;
  total: number;
  answered: Answered;
  guess: (isReal: boolean) => void;
  next: () => void;
}) {
  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          justifyContent: "center",
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i === current ? 20 : 8,
              height: 8,
              borderRadius: 4,
              background:
                i < current
                  ? "var(--ink)"
                  : i === current
                  ? "#c4972a"
                  : "var(--aged)",
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>

      <Clipping snippet={snippet} layout={snippet.layout} index={current} />

      {answered && (
        <div
          style={{
            textAlign: "center",
            margin: "20px 0",
            animation: "stampIn 0.4s cubic-bezier(.2,.8,.3,1)",
          }}
        >
          <div
            style={{
              display: "inline-block",
              border: `4px solid ${
                answered === "correct" ? "var(--green)" : "var(--red)"
              }`,
              padding: "10px 28px",
              transform: answered === "correct" ? "rotate(-2deg)" : "rotate(2deg)",
              background: "var(--cream)",
            }}
          >
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontWeight: 900,
                fontSize: "clamp(20px,4vw,30px)",
                letterSpacing: 4,
                textTransform: "uppercase",
                color: answered === "correct" ? "var(--green)" : "var(--red)",
              }}
            >
              {answered === "correct" ? "✓ Verified" : "✗ Deceived"}
            </div>
            <div
              className="clipping-body"
              style={{
                fontSize: 12,
                fontStyle: "italic",
                opacity: 0.75,
                marginTop: 4,
                textAlign: "center",
              }}
            >
              {snippet.real
                ? `Genuine clipping · ${snippet.source}`
                : "AI fabrication · No such edition exists"}
            </div>
          </div>
        </div>
      )}

      {!answered ? (
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            marginTop: 24,
            flexWrap: "wrap",
          }}
        >
          <NewsButton onClick={() => guess(true)} label="Real" emoji="📰" hint="R" color="var(--green)" />
          <NewsButton onClick={() => guess(false)} label="Fake" emoji="🎭" hint="F" color="var(--red)" />
        </div>
      ) : (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <StampButton onClick={next} color="var(--ink)">
            {current + 1 >= total ? "See Final Results →" : "Next Clipping →"}
            <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 8 }}>
              [Enter]
            </span>
          </StampButton>
        </div>
      )}
    </div>
  );
}
