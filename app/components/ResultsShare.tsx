"use client";

import { useEffect, useMemo, useState } from "react";
import posthog from "posthog-js";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://daily-deceiver.lombardo.cool"
).replace(/\/$/, "");

type ResultsShareProps = {
  score: number;
  total: number;
  title: string;
  layout: 0 | 1 | 2;
};

function buildShareUrl(layout: 0 | 1 | 2, score: number, total: number): string {
  const s = btoa(`${layout}:${score}:${total}`).replace(/=+$/, "");
  return `${SITE_URL}/?s=${s}`;
}

function useCanNativeShare() {
  const [can, setCan] = useState(false);
  useEffect(() => {
    setCan(typeof navigator?.share === "function");
  }, []);
  return can;
}

export function ResultsShare({ score, total, title, layout }: ResultsShareProps) {
  const showNativeShare = useCanNativeShare();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const shareUrl = useMemo(() => buildShareUrl(layout, score, total), [layout, score, total]);
  const shareText = useMemo(
    () => `I scored ${score}/${total} — ${title} — in The Daily Deceiver!`,
    [score, total, title],
  );

  const xHref = useMemo(
    () =>
      `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    [shareText, shareUrl],
  );

  const handleNativeShare = () => {
    navigator
      .share({ title: "The Daily Deceiver", text: shareText, url: shareUrl })
      .then(() => posthog.capture("results_shared", { platform: "native" }))
      .catch(() => {});
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
      posthog.capture("results_shared", { platform: "clipboard" });
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const iconStyle: React.CSSProperties = { width: 14, height: 14, display: "inline-block" };
  const btnStyle: React.CSSProperties = {
    border: "1px solid var(--ink)",
    background: "var(--paper)",
    padding: "10px 16px",
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "'Special Elite',serif",
    fontSize: 12,
    letterSpacing: 1,
    cursor: "pointer",
    color: "inherit",
    textDecoration: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ marginBottom: 28, textAlign: "center" }}>
      <div className="subhead" style={{ marginBottom: 8 }}>
        Share Your Results
      </div>
      <hr className="rule-thick" style={{ marginBottom: 12 }} />
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
        <a
          href={xHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => posthog.capture("results_shared", { platform: "x" })}
          style={btnStyle}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle} fill="currentColor">
            <path d="M18.146 2H21l-6.5 7.43L22 22h-6.2l-4.85-6.34L5.2 22H2l7-8L2 2h6.35l4.4 5.87L18.146 2Zm-1.08 18h1.72L7 4H5.2l11.866 16Z" />
          </svg>
          Share on X
        </a>
        <button type="button" onClick={handleCopy} style={btnStyle}>
          <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle} fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
          </svg>
          {copyState === "copied" ? "Copied!" : copyState === "error" ? "Error" : "Copy Link"}
        </button>
        {showNativeShare && (
          <button type="button" onClick={handleNativeShare} style={btnStyle}>
            <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle} fill="currentColor">
              <path d="M18 16.1c-.8 0-1.5.3-2 .8l-7.2-4.2c.1-.3.2-.6.2-.9s-.1-.6-.2-.9l7.1-4.1c.5.5 1.2.8 2.1.8a2.9 2.9 0 1 0-2.8-3.6L8 8.6a2.9 2.9 0 1 0 0 4.8l7.2 4.2a2.9 2.9 0 1 0 2.8-1.7Z" />
            </svg>
            Share
          </button>
        )}
      </div>
    </div>
  );
}
