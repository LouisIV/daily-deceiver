"use client";

import posthog from "posthog-js";
import type { HistoryItem } from "@/lib/game/types";
import { StampButton } from "./StampButton";
import { getLocSourceLink } from "@/lib/game/source-link";

export function ResultScreen({
  score,
  total,
  grade: [title, sub],
  history,
  restart,
}: {
  score: number;
  total: number;
  grade: [string, string];
  history: HistoryItem[];
  restart: () => void | Promise<void>;
}) {
  const handleRestart = () => {
    posthog.capture("game_restarted", {
      previous_score: score,
      previous_total: total,
      previous_grade: title,
    });
    void restart();
  };

  return (
    <div style={{ animation: "fadeUp 0.5s ease" }}>
      <div
        style={{
          border: "3px double var(--ink)",
          padding: "32px 24px",
          marginBottom: 24,
          background: "var(--cream)",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div className="subhead" style={{ marginBottom: 10 }}>
          Final Verdict
        </div>
        <hr className="rule-thin" style={{ marginBottom: 12 }} />

        <div
          style={{
            fontFamily: "'UnifrakturMaguntia',cursive",
            fontSize: "clamp(52px,11vw,88px)",
            lineHeight: 1,
            color: "var(--ink)",
          }}
        >
          {score}
          <span style={{ fontSize: "0.4em", opacity: 0.35 }}>/{total}</span>
        </div>

        <hr className="rule-thin" style={{ margin: "12px 0 8px" }} />

        <div
          className="headline"
          style={{ fontSize: "clamp(14px,3vw,20px)", letterSpacing: 3 }}
        >
          {title}
        </div>
        <div
          className="clipping-body"
          style={{ fontStyle: "italic", opacity: 0.65, marginTop: 6, fontSize: 14 }}
        >
          "{sub}"
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div className="subhead" style={{ marginBottom: 8 }}>
          Your Record
        </div>
        <hr className="rule-thick" style={{ marginBottom: 10 }} />
        {history.map((h, i) => {
          const sourceLink = getLocSourceLink(h.snippet);
          const sourceLabel = h.snippet.source || "Library of Congress";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                padding: "8px 0",
                borderBottom: "1px solid var(--aged)",
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontWeight: 900,
                  fontSize: 16,
                  flexShrink: 0,
                  color: h.correct ? "var(--green)" : "var(--red)",
                }}
              >
                {h.correct ? "✓" : "✗"}
              </span>
              <div style={{ flex: 1 }}>
                <div className="headline" style={{ fontSize: 11, marginBottom: 2, opacity: 0.8 }}>
                  {h.snippet.headline}
                </div>
                <div
                  className="clipping-body"
                  style={{ fontSize: 11, opacity: 0.65, lineHeight: 1.4 }}
                >
                  {h.snippet.text.slice(0, 100)}…
                </div>
                <div className="subhead" style={{ fontSize: 9, marginTop: 3 }}>
                  {h.snippet.real ? (
                    <>
                      Real · {sourceLabel}
                      {sourceLink ? (
                        <>
                          {" · "}
                          <a
                            href={sourceLink.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "inherit", textDecoration: "underline" }}
                          >
                            {sourceLink.label}
                          </a>
                        </>
                      ) : null}
                    </>
                  ) : (
                    "AI-Generated Fake"
                  )}{" "}
                  · You guessed:{" "}
                  {h.guessReal ? "Real" : "Fake"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center" }}>
        <StampButton onClick={handleRestart} color="var(--ink)">
          🗞 Print Another Edition
        </StampButton>
        <div
          className="clipping-body"
          style={{ fontStyle: "italic", fontSize: 10, opacity: 0.35, marginTop: 10 }}
        >
          Each new game fetches fresh real clippings from the Library of Congress
        </div>
      </div>
    </div>
  );
}
