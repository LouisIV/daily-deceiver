"use client";

import posthog from "posthog-js";
import type { Answered, Round } from "@/lib/game/types";
import { Clipping } from "./Clipping";
import { NewsButton } from "./NewsButton";
import { StampButton } from "./StampButton";
import { PaperTexture } from "@/lib/paper-texture-client";
import { getLocSourceLink } from "@/lib/game/source-link";
import { PaperPreview } from "./PaperPreview";

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
  const sourceLink = getLocSourceLink(snippet);
  const sourceLabel = snippet.source || "Library of Congress";

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

      <PaperTexture
        opacity={0.18}
        intensity={2}
        opacityIOS={0.3}
        intensityIOS={3}
      >
        <Clipping snippet={snippet} layout={snippet.layout} index={current} />
      </PaperTexture>

      {answered && (
        <div>
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
                  ? (
                    <>
                      Genuine clipping · {sourceLabel}
                      {sourceLink ? (
                        <>
                          {" · "}
                          <a
                            href={sourceLink.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "inherit", textDecoration: "underline" }}
                            onClick={() =>
                              posthog.capture("source_link_clicked", {
                                question_number: current + 1,
                                headline: snippet.headline,
                                source_label: sourceLink.label,
                                source_href: sourceLink.href,
                                link_type: "verdict_text",
                              })
                            }
                          >
                            {sourceLink.label}
                          </a>
                        </>
                      ) : null}
                    </>
                  )
                  : "AI fabrication · No such edition exists"}
              </div>
            </div>
          </div>

          {snippet.real && (
            <PaperPreview snippet={snippet} questionNumber={current + 1} />
          )}
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
