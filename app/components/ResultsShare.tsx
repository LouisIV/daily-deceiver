"use client";

import { useEffect, useMemo, useState } from "react";
import posthog from "posthog-js";
import { encodePapers } from "@/lib/game/share";
import type { SharePaper } from "@/lib/game/share";

type ResultsShareProps = {
  score: number;
  total: number;
  title: string;
  sub: string;
  papers?: SharePaper[];
};

export function ResultsShare({ score, total, title, sub, papers }: ResultsShareProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const sharePath = useMemo(() => {
    const params = new URLSearchParams({
      score: String(score),
      total: String(total),
      grade: title,
    });
    if (papers && papers.length > 0) {
      params.set("papers", encodePapers(papers));
    }
    return `/share?${params.toString()}`;
  }, [score, total, title, papers]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}${sharePath}`);
      setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    }
  }, [sharePath]);

  const shareText = useMemo(() => {
    const base = `I scored ${score}/${total} in Newspaper Game — ${title}.`;
    return sub ? `${base} "${sub}"` : base;
  }, [score, total, title, sub]);

  const shareLinks = useMemo(() => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    return {
      x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    };
  }, [shareText, shareUrl]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
      posthog.capture("results_shared", { platform: "copy" });
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl || !canNativeShare) return;
    try {
      await navigator.share({
        title: "Newspaper Game",
        text: shareText,
        url: shareUrl,
      });
      posthog.capture("results_shared", { platform: "native" });
    } catch {
      // User canceled or share failed; no-op.
    }
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
            padding: "8px 14px",
            fontFamily: "'Special Elite',serif",
            fontSize: 12,
            letterSpacing: 1,
            textDecoration: "none",
            color: "inherit",
            opacity: shareUrl ? 1 : 0.6,
            pointerEvents: shareUrl ? "auto" : "none",
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
        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => posthog.capture("results_shared", { platform: "facebook" })}
          style={{
            border: "1px solid var(--ink)",
            background: "var(--paper)",
            padding: "8px 14px",
            fontFamily: "'Special Elite',serif",
            fontSize: 12,
            letterSpacing: 1,
            textDecoration: "none",
            color: "inherit",
            opacity: shareUrl ? 1 : 0.6,
            pointerEvents: shareUrl ? "auto" : "none",
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
              <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.7c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.7-1.6 1.5v1.8H16l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z" />
            </svg>
            Share on Facebook
          </span>
        </a>
        <a
          href={shareLinks.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => posthog.capture("results_shared", { platform: "linkedin" })}
          style={{
            border: "1px solid var(--ink)",
            background: "var(--paper)",
            padding: "8px 14px",
            fontFamily: "'Special Elite',serif",
            fontSize: 12,
            letterSpacing: 1,
            textDecoration: "none",
            color: "inherit",
            opacity: shareUrl ? 1 : 0.6,
            pointerEvents: shareUrl ? "auto" : "none",
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
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.44a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm-1.78 13h3.56V9H3.56v11.45Z" />
            </svg>
            Share on LinkedIn
          </span>
        </a>
        {canNativeShare ? (
          <button
            type="button"
            onClick={handleNativeShare}
            style={{
              border: "1px solid var(--ink)",
              background: "var(--paper)",
              padding: "8px 14px",
              fontFamily: "'Special Elite',serif",
              fontSize: 12,
              letterSpacing: 1,
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
              Share More
            </span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleCopy}
          style={{
            border: "1px solid var(--ink)",
            background: "var(--paper)",
            padding: "8px 14px",
            fontFamily: "'Special Elite',serif",
            fontSize: 12,
            letterSpacing: 1,
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
              <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z" />
            </svg>
            {copyState === "copied"
              ? "Link Copied"
              : copyState === "error"
              ? "Copy Failed"
              : "Copy Link"}
          </span>
        </button>
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
