"use client";

import { useEffect, useMemo, useState } from "react";
import posthog from "posthog-js";
import type { Snippet } from "@/lib/game/types";
import { PaperTexture } from "@/lib/paper-texture";
import { getLocSourceLink, getLocSourceMedia } from "@/lib/game/source-link";

const DefaultPostIt = (
  <>
    Read
    <br />
    Me
  </>
);

export function PaperPreview({
  snippet,
  questionNumber,
  linkTypePrefix,
  selectOnly,
  postIt = DefaultPostIt,
}: {
  snippet: Snippet;
  questionNumber?: number;
  linkTypePrefix?: string;
  /** When true, image/link click only selects (e.g. in results carousel); prevents navigation */
  selectOnly?: boolean;
  postIt?: React.ReactNode;
}) {
  if (!snippet.real) return null;

  const sourceLink = getLocSourceLink(snippet);
  const sourceMedia = getLocSourceMedia(snippet);
  const sourceLabel = snippet.source || "Library of Congress";
  const fallbackHref = sourceMedia?.pageHref || sourceLink?.href || null;
  const [imageFailed, setImageFailed] = useState(false);
  const showImagePreview = Boolean(sourceMedia?.mediaHref) && !imageFailed;
  const previewHref = sourceMedia?.mediaHref || undefined;
  const prefix = linkTypePrefix ? `${linkTypePrefix}_` : "";

  const imageJitter = useMemo(() => {
    const key = `${snippet.headline}|${sourceMedia?.mediaHref || ""}`;
    let hash = 2166136261;
    for (let i = 0; i < key.length; i += 1) {
      hash ^= key.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const rand = (min: number, max: number) => {
      hash = Math.imul(hash ^ (hash >>> 15), 2246822519);
      const t = ((hash >>> 0) % 10000) / 10000;
      return min + (max - min) * t;
    };
    return {
      imageRotate: rand(-1.8, 1.2),
      imageOffsetX: rand(-4, 4),
      imageOffsetY: rand(-2, 4),
      calloutRotate: rand(-22, 16),
      calloutOffsetX: rand(-36, 36),
      calloutOffsetY: rand(-28, 28),
      buttonRotate: rand(-1.2, 1.6),
      buttonOffsetY: rand(-4, 4),
    };
  }, [snippet.headline, sourceMedia?.mediaHref]);

  useEffect(() => {
    setImageFailed(false);
  }, [snippet.headline, sourceMedia?.mediaHref]);

  if (!showImagePreview) {
    return (
      <div
        style={{
          margin: "10px auto 0",
          maxWidth: 680,
          border: "1px solid #c8b080",
          background: "var(--cream)",
          padding: "14px 12px",
          boxShadow: "1px 2px 10px rgba(0,0,0,0.06)",
          textAlign: "center",
        }}
      >
        <div
          className="subhead"
          style={{ fontSize: 11, letterSpacing: 1.2, marginBottom: 6 }}
        >
          ARCHIVE PREVIEW UNAVAILABLE
        </div>
        <div
          className="clipping-body"
          style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}
        >
          This clipping has no inline paper image. Open the {sourceLabel} record
          to view available scans and details.
        </div>
        {fallbackHref ? (
          <a
            href={fallbackHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              border: "1px solid var(--ink)",
              padding: "6px 12px",
              textDecoration: "none",
              color: "inherit",
              fontFamily: "'Special Elite',serif",
              fontSize: 11,
              letterSpacing: 0.8,
              background: "rgba(255,255,255,0.45)",
            }}
            onClick={() =>
              posthog.capture("source_link_clicked", {
                question_number: questionNumber,
                headline: snippet.headline,
                source_href: fallbackHref,
                link_type: `${prefix}no_preview_fallback`,
              })
            }
          >
            Open on {sourceLabel}
          </a>
        ) : (
          <div className="subhead" style={{ fontSize: 10, opacity: 0.7 }}>
            No source URL available for this clipping
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="paper-image-group">
      <a
        href={fallbackHref || previewHref}
        target="_blank"
        rel="noopener noreferrer"
        className="paper-image-link"
        style={
          {
            "--image-x": `${imageJitter.imageOffsetX}px`,
            "--image-y": `${imageJitter.imageOffsetY}px`,
            "--image-rot": `${imageJitter.imageRotate}deg`,
          } as React.CSSProperties
        }
        onClick={(e) => {
          if (selectOnly) e.preventDefault();
          posthog.capture("source_link_clicked", {
            question_number: questionNumber,
            headline: snippet.headline,
            source_href: fallbackHref || previewHref,
            link_type: `${prefix}image_preview`,
          });
        }}
      >
        <PaperTexture
          opacity={0.22}
          intensity={1.1}
          style={{ background: "var(--paper)" }}
        >
          <img
            alt="Library of Congress clipping preview"
            src={sourceMedia?.mediaHref || ""}
            onError={() => setImageFailed(true)}
            className="paper-image"
          />
        </PaperTexture>
        {postIt && (
          <div
            className="paper-image-callout"
            aria-hidden="true"
            style={{
              transform: `translate(calc(-50% + ${imageJitter.calloutOffsetX}px), calc(-50% + ${imageJitter.calloutOffsetY}px)) rotate(${imageJitter.calloutRotate}deg)`,
            }}
          >
            <span className="paper-image-callout-text">{postIt}</span>
          </div>
        )}
      </a>
      <a
        href={fallbackHref || previewHref}
        target="_blank"
        rel="noopener noreferrer"
        className="paper-image-button"
        style={
          {
            "--button-y": `${imageJitter.buttonOffsetY}px`,
            "--button-rot": `${imageJitter.buttonRotate}deg`,
          } as React.CSSProperties
        }
        onClick={() =>
          posthog.capture("source_link_clicked", {
            question_number: questionNumber,
            headline: snippet.headline,
            source_href: fallbackHref || previewHref,
            link_type: `${prefix}image_preview_button`,
          })
        }
      >
        <PaperTexture
          opacity={0.22}
          intensity={1.1}
          style={{ background: "var(--paper)" }}
        >
          <span className="paper-image-button-text">
            {sourceLabel} →
          </span>
        </PaperTexture>
      </a>
    </div>
  );
}
