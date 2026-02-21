"use client";

import type { Phase } from "@/lib/game/types";

export function Masthead({
  score,
  current,
  phase,
}: {
  score: number;
  current: number;
  phase: Phase;
}) {
  return (
    <header style={{ paddingTop: 24, paddingBottom: 0, textAlign: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <hr className="rule-thick" style={{ flex: 1 }} />
        <span className="ornament" style={{ fontSize: 18 }}>
          ✦ ✦ ✦
        </span>
        <hr className="rule-thick" style={{ flex: 1 }} />
      </div>

      <div className="subhead" style={{ marginBottom: 4 }}>
        Est. MDCCCLXXXI
      </div>

      <h1 className="masthead-title">The Daily Deceiver</h1>

      <div className="subhead" style={{ marginTop: 4, fontSize: 10 }}>
        "All The News That's Fit To Question" · One Cent Per Copy
      </div>

      <hr className="rule-thin" style={{ marginTop: 6 }} />
      <hr className="rule-thick" style={{ marginTop: 2, marginBottom: 6 }} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span className="subhead" style={{ fontSize: 9 }}>
          Powered by the Library of Congress and Chronicling America
        </span>
        {phase === "playing" && (
          <span
            style={{
              fontFamily: "'Playfair Display',serif",
              fontWeight: 700,
              fontSize: 13,
              color: "var(--ink)",
            }}
          >
            Score: {score} / {current}
          </span>
        )}

      </div>

      <hr className="rule-double" style={{ marginBottom: 20 }} />
    </header>
  );
}
