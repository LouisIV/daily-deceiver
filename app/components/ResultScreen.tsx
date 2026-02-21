"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import posthog from "posthog-js";
import type { HistoryItem } from "@/lib/game/types";
import { StampButton } from "./StampButton";
import { getLocSourceLink } from "@/lib/game/source-link";
import { PaperPreview } from "./PaperPreview";
import { ResultsShare } from "./ResultsShare";
import type { SharePaper } from "@/lib/game/share";

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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragState = useRef({
    active: false,
    captured: false,
    startX: 0,
    startScroll: 0,
    downTarget: null as Element | null,
  });
  const DRAG_THRESHOLD_PX = 6;
  const isScrollingFromSelect = useRef(false);
  const scrollRaf = useRef<number | null>(null);
  const getPaperJitter = (key: string, index: number) => {
    let hash = 2166136261;
    const seed = `${key}-${index}`;
    for (let i = 0; i < seed.length; i += 1) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const rand = (min: number, max: number) => {
      hash = Math.imul(hash ^ (hash >>> 15), 2246822519);
      const t = ((hash >>> 0) % 10000) / 10000;
      return min + (max - min) * t;
    };
    return {
      rot: rand(-3.5, 3.5),
      x: rand(-10, 10),
      y: rand(-8, 10),
      z: Math.round(rand(0, 6)),
      handRot: rand(-14, 14),
    };
  };
  const realHistory = history.flatMap((item, index) =>
    item.snippet.real ? [{ item, questionNumber: index + 1 }] : []
  );
  const uniqueHistory = (() => {
    const seen = new Set<string>();
    const deduped: typeof realHistory = [];
    for (const entry of realHistory) {
      const link = getLocSourceLink(entry.item.snippet);
      const key =
        link?.href ||
        entry.item.snippet.pageUrl ||
        entry.item.snippet.pdfUrl ||
        entry.item.snippet.imageUrl ||
        entry.item.snippet.url ||
        `${entry.item.snippet.headline}-${entry.questionNumber}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(entry);
    }
    return deduped;
  })();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = uniqueHistory[selectedIndex]?.item;
  const selectedSourceLink = selected ? getLocSourceLink(selected.snippet) : null;
  const selectedSourceLabel = selected?.snippet.source || "Library of Congress";

  useEffect(() => {
    if (selectedIndex >= uniqueHistory.length) {
      setSelectedIndex(0);
    }
  }, [uniqueHistory.length, selectedIndex]);

  const selectIndex = (nextIndex: number) => {
    if (!uniqueHistory.length) return;
    const clamped = (nextIndex + uniqueHistory.length) % uniqueHistory.length;
    setSelectedIndex(clamped);
    const target = itemRefs.current[clamped];
    if (target && scrollRef.current) {
      isScrollingFromSelect.current = true;
      requestAnimationFrame(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
        setTimeout(() => {
          isScrollingFromSelect.current = false;
        }, 600);
      });
    }
  };

  const updateSelectedFromScroll = () => {
    const container = scrollRef.current;
    if (!container || uniqueHistory.length === 0 || isScrollingFromSelect.current) return;
    const scrollLeft = container.scrollLeft;
    const containerCenter = scrollLeft + container.clientWidth / 2;
    let bestIndex = 0;
    let bestDist = Infinity;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const elCenter = rect.left - containerRect.left + rect.width / 2 + scrollLeft;
      const dist = Math.abs(elCenter - containerCenter);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    });
    setSelectedIndex(bestIndex);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = scrollRef.current;
    if (!target) return;
    dragState.current.active = true;
    dragState.current.captured = false;
    dragState.current.startX = event.clientX;
    dragState.current.startScroll = target.scrollLeft;
    dragState.current.downTarget = event.target as Element;
    // Don't capture yet: wait for movement so a simple click still fires on the paper-item
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = scrollRef.current;
    if (!target || !dragState.current.active) return;
    if (!dragState.current.captured) {
      const move = Math.abs(event.clientX - dragState.current.startX);
      if (move < DRAG_THRESHOLD_PX) return;
      dragState.current.captured = true;
      target.setPointerCapture(event.pointerId);
    }
    const delta = event.clientX - dragState.current.startX;
    target.scrollLeft = dragState.current.startScroll - delta;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = scrollRef.current;
    if (!target) return;
    if (dragState.current.captured) {
      target.releasePointerCapture(event.pointerId);
    } else if (
      dragState.current.downTarget &&
      uniqueHistory.length > 0
    ) {
      // Click/tap without drag: ensure we select the item that was pressed (handles last item when release lands on spacer)
      const paperItem = (dragState.current.downTarget as Element).closest?.("[data-paper-index]");
      const idx = paperItem != null ? parseInt(paperItem.getAttribute("data-paper-index") ?? "", 10) : -1;
      if (idx >= 0 && !Number.isNaN(idx)) {
        selectIndex(idx);
      }
    }
    dragState.current.active = false;
    dragState.current.captured = false;
    dragState.current.downTarget = null;
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

      <ResultsShare
        score={score}
        total={total}
        title={title}
        sub={sub}
        papers={uniqueHistory.slice(0, 2).map(({ item }): SharePaper => ({
          headline: item.snippet.headline,
          source: item.snippet.source,
          imageUrl: item.snippet.imageUrl,
        }))}
      />

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

      <div style={{ marginBottom: 28 }}>
        <div className="subhead" style={{ marginBottom: 8 }}>
          Read the Papers
        </div>
        <hr className="rule-thick" style={{ marginBottom: 12 }} />
        {uniqueHistory.length ? (
          <>
           

            <div
              ref={scrollRef}
              className="papers-scroll"
              style={{
                cursor: "grab",
              }}
              onScroll={() => {
                if (scrollRaf.current != null) cancelAnimationFrame(scrollRaf.current);
                scrollRaf.current = requestAnimationFrame(() => {
                  scrollRaf.current = null;
                  updateSelectedFromScroll();
                });
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {uniqueHistory.map(({ item, questionNumber }, index) => {
                const jitter = getPaperJitter(item.snippet.headline, index);
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={`paper-${questionNumber}`}
                    data-paper-index={index}
                    ref={(node) => {
                      itemRefs.current[index] = node;
                    }}
                    className={`paper-item${isSelected ? " is-selected" : ""}`}
                    style={{
                      transform: `translate(${jitter.x}px, ${jitter.y}px) rotate(${jitter.rot}deg)`,
                      zIndex: index * 10 + jitter.z,
                      "--hand-rot": `${jitter.handRot}deg`,
                    } as React.CSSProperties}
                    onClick={() => selectIndex(index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectIndex(index);
                      }
                    }}
                  >
                    <PaperPreview
                      snippet={item.snippet}
                      questionNumber={questionNumber}
                      linkTypePrefix="results"
                      selectOnly
                      postIt={null}
                    />
                  </div>
                );
              })}
            </div>

            <div
              className="papers-nav"
              style={{
                justifyContent: "center",
                gap: 10,
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => selectIndex(selectedIndex - 1)}
                style={{
                  border: "1px solid var(--ink)",
                  background: "var(--paper)",
                  padding: "6px 12px",
                  fontFamily: "'Special Elite',serif",
                  fontSize: 12,
                  letterSpacing: 1,
                }}
              >
                &lt;
              </button>
              <div className="subhead" style={{ fontSize: 10, opacity: 0.7 }}>
                Paper {selectedIndex + 1} of {uniqueHistory.length}
              </div>
              <button
                type="button"
                onClick={() => selectIndex(selectedIndex + 1)}
                style={{
                  border: "1px solid var(--ink)",
                  background: "var(--paper)",
                  padding: "6px 12px",
                  fontFamily: "'Special Elite',serif",
                  fontSize: 12,
                  letterSpacing: 1,
                }}
              >
                &gt;
              </button>
            </div>

            {selected ? (
              <div
                style={{
                  marginTop: 14,
                  borderTop: "1px dashed var(--aged)",
                  paddingTop: 12,
                  textAlign: "center",
                }}
              >
                <div className="headline" style={{ fontSize: 16, marginBottom: 6 }}>
                  {selected.snippet.headline}
                </div>
                <div
                  className="clipping-body"
                  style={{ fontSize: 12, opacity: 0.75, maxWidth: 640, margin: "0 auto 6px" }}
                >
                  {selected.snippet.text}
                </div>
                <div className="subhead" style={{ fontSize: 10 }}>
                  Archive · {selectedSourceLabel}
                  {selectedSourceLink ? (
                    <>
                      {" · "}
                      <a
                        href={selectedSourceLink.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "inherit", textDecoration: "underline" }}
                      >
                        {selectedSourceLink.label}
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div
            className="clipping-body"
            style={{ fontSize: 12, opacity: 0.7, textAlign: "center" }}
          >
            No archive papers appeared in this round.
          </div>
        )}
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
