"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import posthog from "posthog-js";
import type { SharePaper } from "@/lib/game/share";

const BASE_SHARE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://daily-deceiver.lombardo.cool"
).replace(/\/$/, "");

function getShareOrigin(): string {
  if (typeof window === "undefined") return BASE_SHARE_URL;
  return window.location.origin;
}

type ResultsShareProps = {
  score: number;
  total: number;
  title: string;
  sub: string;
  papers?: SharePaper[];
};

type CachedShareData = {
  shareUrl: string;
  shareText: string;
  files: File[];
};

/** Show native Share when API exists or on touch devices (e.g. iOS) so the button is visible; we try share on tap and fall back if needed. */
function useCanNativeShare() {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setCanNativeShare(typeof navigator.share === "function");
    setIsTouch(
      "maxTouchPoints" in navigator ? navigator.maxTouchPoints > 0 : "ontouchstart" in window
    );
  }, []);
  return canNativeShare || isTouch;
}

export function ResultsShare({ score, total, title, sub, papers = [] }: ResultsShareProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const showNativeShare = useCanNativeShare();
  const [preloadReady, setPreloadReady] = useState(false);
  const cachedShareRef = useRef<CachedShareData | null>(null);

  const shareText = useMemo(() => {
    const base = `I scored ${score}/${total} in Newspaper Game — ${title}.`;
    return sub ? `${base} "${sub}"` : base;
  }, [score, total, title, sub]);

  const shareLinks = useMemo(() => {
    const shareUrl = cachedShareRef.current?.shareUrl ?? getShareOrigin();
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    return {
      x: `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    };
  }, [shareText, preloadReady]);

  // Preload share payload and optional image so navigator.share() can be called synchronously on tap (required on iOS Safari).
  useEffect(() => {
    let cancelled = false;
    const payload = { score, total, grade: title, papers };
    fetch("/api/share/encode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { h?: string } | null) => {
        if (cancelled || !json?.h) {
          const origin = getShareOrigin();
          cachedShareRef.current = { shareUrl: origin, shareText, files: [] };
          setPreloadReady(true);
          return;
        }
        const h = json.h;
        const origin = getShareOrigin();
        const shareUrl = `${origin}/share?h=${encodeURIComponent(h)}`;
        const imgUrl = `/api/og-share?h=${encodeURIComponent(h)}`;
        fetch(imgUrl)
          .then((imgRes) => (imgRes.ok ? imgRes.blob() : null))
          .then((blob) => {
            if (cancelled) return;
            const files =
              blob != null
                ? [new File([blob], "daily-deceiver-score.png", { type: "image/png" })]
                : [];
            cachedShareRef.current = { shareUrl, shareText, files };
            setPreloadReady(true);
          })
          .catch(() => {
            if (!cancelled) {
              cachedShareRef.current = { shareUrl, shareText, files: [] };
              setPreloadReady(true);
            }
          });
      })
      .catch(() => {
        if (!cancelled) {
          cachedShareRef.current = { shareUrl: getShareOrigin(), shareText, files: [] };
          setPreloadReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [score, total, title, shareText, papers]);

  const handleCopy = async () => {
    const url = cachedShareRef.current?.shareUrl ?? getShareOrigin();
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
      posthog.capture("results_shared", { platform: "copy" });
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const handleNativeShare = () => {
    const hasShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
    if (!hasShare) {
      handleCopy();
      return;
    }
    const cached = cachedShareRef.current;
    if (!cached) {
      handleCopy();
      return;
    }
    const shareData: Parameters<typeof navigator.share>[0] = {
      title: "Newspaper Game",
      text: cached.shareText,
      url: cached.shareUrl,
    };
    if (
      cached.files.length > 0 &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ ...shareData, files: cached.files })
    ) {
      shareData.files = cached.files;
    }
    navigator.share(shareData).then(
      () => posthog.capture("results_shared", { platform: "native" }),
      () => {}
    );
  };

  const iconStyle: React.CSSProperties = {
    width: 14,
    height: 14,
    display: "inline-block",
  };

  const buttonContentStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };

  return (
    <div style={{ marginBottom: 28, textAlign: "center" }}>
      <div className="subhead" style={{ marginBottom: 8 }}>
        Share Your Results
      </div>
      <hr className="rule-thick" style={{ marginBottom: 12 }} />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <a
          href={shareLinks.x}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => posthog.capture("results_shared", { platform: "x" })}
          style={{
            border: "1px solid var(--ink)",
            background: "var(--paper)",
            padding: "10px 16px",
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
            boxSizing: "border-box",
            fontFamily: "'Special Elite',serif",
            fontSize: 12,
            letterSpacing: 1,
            textDecoration: "none",
            color: "inherit",
            opacity: 1,
            pointerEvents: "auto",
          }}
        >
          <span style={buttonContentStyle}>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
              style={iconStyle}
              fill="currentColor"
            >
              <path d="M18.146 2H21l-6.5 7.43L22 22h-6.2l-4.85-6.34L5.2 22H2l7-8L2 2h6.35l4.4 5.87L18.146 2Zm-1.08 18h1.72L7 4H5.2l11.866 16Z" />
            </svg>
            Share on X
          </span>
        </a>
        {showNativeShare ? (
          <button
            type="button"
            onClick={handleNativeShare}
            disabled={!preloadReady}
            style={{
              border: "1px solid var(--ink)",
              background: "var(--paper)",
              padding: "10px 16px",
              minHeight: 44,
              minWidth: 44,
              fontFamily: "'Special Elite',serif",
              fontSize: 12,
              letterSpacing: 1,
              opacity: preloadReady ? 1 : 0.7,
              cursor: preloadReady ? "pointer" : "wait",
            }}
          >
            <span style={buttonContentStyle}>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                style={iconStyle}
                fill="currentColor"
              >
                <path d="M18 16.1c-.8 0-1.5.3-2 .8l-7.2-4.2c.1-.3.2-.6.2-.9s-.1-.6-.2-.9l7.1-4.1c.5.5 1.2.8 2.1.8a2.9 2.9 0 1 0-2.8-3.6L8 8.6a2.9 2.9 0 1 0 0 4.8l7.2 4.2a2.9 2.9 0 1 0 2.8-1.7Z" />
              </svg>
              {preloadReady ? "Share" : "Preparing…"}
            </span>
          </button>
        ) : null}
      </div>
      <div
        className="clipping-body"
        style={{ fontStyle: "italic", fontSize: 10, opacity: 0.5, marginTop: 8 }}
      >
        Share your score and help others find the papers.
      </div>
    </div>
  );
}
