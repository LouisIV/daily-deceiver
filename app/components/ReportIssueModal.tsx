"use client";

import { useState } from "react";
import posthog from "posthog-js";
import type { Round } from "@/lib/game/types";
import { CLIPPING_ISSUE_PRESETS } from "@/lib/clipping-report-options";

type SnippetPayload = {
  headline: string;
  text: string;
  subheading?: string;
  source?: string;
  pageUrl?: string;
  pdfUrl?: string;
  imageUrl?: string;
  url?: string;
  real: boolean;
};

export function ReportIssueModal({
  snippet,
  questionNumber,
  onClose,
}: {
  snippet: Round;
  questionNumber: number;
  onClose: () => void;
}) {
  const [preset, setPreset] = useState<string>(CLIPPING_ISSUE_PRESETS[0].value);
  const [reasonText, setReasonText] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "duplicate" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const payload: SnippetPayload = {
    headline: snippet.headline,
    text: snippet.text,
    subheading: snippet.subheading,
    source: snippet.source,
    pageUrl: snippet.pageUrl,
    pdfUrl: snippet.pdfUrl,
    imageUrl: snippet.imageUrl,
    url: snippet.url,
    real: snippet.real,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const distinctId = posthog.get_distinct_id();
    const res = await fetch("/api/clipping-reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(distinctId ? { "x-posthog-distinct-id": distinctId } : {}),
      },
      body: JSON.stringify({
        snippet: payload,
        reasonPreset: preset,
        reasonText: reasonText.trim() || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 201) {
      setStatus("success");
      posthog.capture("clipping_issue_reported_ui", {
        question_number: questionNumber,
        reason_preset: preset,
        has_reason_text: Boolean(reasonText.trim()),
        clipping_is_real: snippet.real,
      });
    } else if (res.status === 200 && data.duplicate) {
      setStatus("duplicate");
    } else if (res.status === 409) {
      setStatus("duplicate");
    } else {
      setStatus("error");
      setErrorMessage(data.error || "Something went wrong.");
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
  };

  const panelStyle: React.CSSProperties = {
    background: "var(--cream)",
    border: "2px solid var(--ink)",
    boxShadow: "6px 8px 0 rgba(0,0,0,0.2)",
    maxWidth: 440,
    width: "100%",
    padding: "24px 28px",
  };

  if (status === "success" || status === "duplicate") {
    return (
      <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="report-result">
        <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
          <div className="headline" style={{ fontSize: 18, marginBottom: 12 }}>
            {status === "success" ? "Report submitted" : "Already reported"}
          </div>
          <p className="clipping-body" style={{ fontSize: 14, marginBottom: 20 }}>
            {status === "success"
              ? "Thanks — we’ll review this clipping."
              : "This clipping has already been reported."}
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: "'Special Elite',serif",
              fontSize: 14,
              padding: "8px 20px",
              background: "var(--ink)",
              color: "var(--cream)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="report-issue-title">
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <h2 id="report-issue-title" className="headline" style={{ fontSize: 20, marginBottom: 8 }}>
          Report issue with clipping
        </h2>
        <p className="clipping-body" style={{ fontSize: 13, opacity: 0.85, marginBottom: 20 }}>
          Help us improve quality. What’s wrong with this clipping?
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            {CLIPPING_ISSUE_PRESETS.map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: "block",
                  marginBottom: 10,
                  fontFamily: "'IM Fell English',Georgia,serif",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="preset"
                  value={opt.value}
                  checked={preset === opt.value}
                  onChange={() => setPreset(opt.value)}
                  style={{ marginRight: 10 }}
                />
                {opt.label}
              </label>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="report-reason-text"
              className="subhead"
              style={{ display: "block", marginBottom: 6, fontSize: 10 }}
            >
              Additional details (optional)
            </label>
            <textarea
              id="report-reason-text"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Describe the issue…"
              rows={3}
              disabled={status === "submitting"}
              style={{
                width: "100%",
                padding: 10,
                fontFamily: "'IM Fell English',Georgia,serif",
                fontSize: 14,
                border: "1px solid #c8b080",
                background: "var(--paper)",
                resize: "vertical",
              }}
            />
          </div>

          {status === "error" && (
            <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>
              {errorMessage}
            </p>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={status === "submitting"}
              style={{
                fontFamily: "'Special Elite',serif",
                fontSize: 14,
                padding: "10px 24px",
                background: "var(--ink)",
                color: "var(--cream)",
                border: "none",
                cursor: status === "submitting" ? "wait" : "pointer",
              }}
            >
              {status === "submitting" ? "Sending…" : "Submit report"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={status === "submitting"}
              style={{
                fontFamily: "'Special Elite',serif",
                fontSize: 14,
                padding: "10px 24px",
                background: "transparent",
                color: "var(--ink)",
                border: "1px solid var(--ink)",
                cursor: status === "submitting" ? "wait" : "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
