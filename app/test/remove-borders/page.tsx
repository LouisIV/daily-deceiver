"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const SAMPLE_URLS = [
  "https://tile.loc.gov/image-services/iiif/service:ndnp:nbu:batch_nbu_fairbury_ver01:data:sn96080161:00206539215:1899033001:0532/full/pct:6.25/0/default.jpg",
  "https://tile.loc.gov/image-services/iiif/service:ndnp:dlc:batch_dlc_triumph_ver02:data:sn83030214:00175036817:1898021701:0297/full/pct:3.125/0/default.jpg",
];

type Mode = "black" | "white" | "both";

interface DetectedThresholds {
  blackThreshold: number;
  whiteThreshold: number;
}

const inputStyle: React.CSSProperties = {
  padding: "6px 8px",
  border: "1px solid var(--aged)",
  background: "var(--paper)",
  color: "var(--ink)",
  fontFamily: "system-ui, sans-serif",
  fontSize: 12,
  width: "100%",
  boxSizing: "border-box",
};

function CheckerBg({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundImage: "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%)",
        backgroundSize: "20px 20px",
        border: "1px solid var(--aged)",
        borderRadius: 4,
        overflow: "hidden",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "6px 0",
        border: "1px solid var(--ink)",
        background: active ? "var(--ink)" : "var(--paper)",
        color: active ? "var(--cream)" : "var(--ink)",
        cursor: "pointer",
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        fontWeight: active ? 700 : 400,
        letterSpacing: 0.5,
      }}
    >
      {label}
    </button>
  );
}

function Tag({
  label,
  value,
  auto,
}: {
  label: string;
  value: number | null;
  auto: boolean;
}) {
  if (value === null) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        border: "1px solid var(--aged)",
        background: auto ? "var(--ink)" : "var(--paper)",
        color: auto ? "var(--cream)" : "var(--ink)",
        fontSize: 11,
        fontFamily: "monospace",
      }}
    >
      {label} {value}
      {auto && (
        <span
          style={{
            fontSize: 10,
            opacity: 0.75,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          auto
        </span>
      )}
    </span>
  );
}

export default function TestRemoveBordersPage() {
  const [url, setUrl] = useState(SAMPLE_URLS[0]);
  const [mode, setMode] = useState<Mode>("both");

  // undefined = auto-detect; number = explicit override
  const [blackOverride, setBlackOverride] = useState<number | undefined>(
    undefined,
  );
  const [whiteOverride, setWhiteOverride] = useState<number | undefined>(
    undefined,
  );

  // What the sliders display (seeded from auto-detect, adjustable)
  const [blackSlider, setBlackSlider] = useState(40);
  const [whiteSlider, setWhiteSlider] = useState(215);

  const [detected, setDetected] = useState<DetectedThresholds | null>(null);
  const [detecting, setDetecting] = useState(false);

  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [usedThresholds, setUsedThresholds] =
    useState<DetectedThresholds | null>(null);
  const [processing, setProcessing] = useState(false);

  const prevObjectUrl = useRef<string | null>(null);

  const showBlack = mode === "black" || mode === "both";
  const showWhite = mode === "white" || mode === "both";

  // Auto-detect thresholds whenever URL changes
  useEffect(() => {
    if (!url.trim()) return;
    setDetected(null);
    setDetecting(true);

    const controller = new AbortController();
    fetch(`/api/remove-borders/detect?url=${encodeURIComponent(url.trim())}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: DetectedThresholds) => {
        setDetected(data);
        // Seed sliders with detected values; reset overrides
        setBlackSlider(data.blackThreshold);
        setWhiteSlider(data.whiteThreshold);
        setBlackOverride(undefined);
        setWhiteOverride(undefined);
      })
      .catch(() => {})
      .finally(() => setDetecting(false));

    return () => controller.abort();
  }, [url]);

  // Process image whenever relevant params change
  useEffect(() => {
    if (!url.trim()) return;

    const params = new URLSearchParams({ mode });
    if (showBlack && blackOverride !== undefined)
      params.set("blackThreshold", String(blackOverride));
    if (showWhite && whiteOverride !== undefined)
      params.set("whiteThreshold", String(whiteOverride));

    const apiUrl = `/api/remove-borders?url=${encodeURIComponent(url.trim())}&${params}`;

    setProcessing(true);
    const controller = new AbortController();

    fetch(apiUrl, { signal: controller.signal })
      .then(async (res) => {
        const bt = parseInt(res.headers.get("X-Black-Threshold") ?? "", 10);
        const wt = parseInt(res.headers.get("X-White-Threshold") ?? "", 10);
        if (!isNaN(bt) && !isNaN(wt))
          setUsedThresholds({ blackThreshold: bt, whiteThreshold: wt });

        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);

        // Revoke the previous object URL to avoid memory leaks
        if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
        prevObjectUrl.current = objectUrl;
        setProcessedSrc(objectUrl);
      })
      .catch(() => {})
      .finally(() => setProcessing(false));

    return () => {
      controller.abort();
    };
  }, [url, mode, blackOverride, whiteOverride, showBlack, showWhite]);

  // Revoke on unmount
  useEffect(() => {
    return () => {
      if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
    };
  }, []);

  const modeLabel = usedThresholds
    ? mode === "black"
      ? `black ≤ ${usedThresholds.blackThreshold}`
      : mode === "white"
        ? `white ≥ ${usedThresholds.whiteThreshold}`
        : `black ≤ ${usedThresholds.blackThreshold}, white ≥ ${usedThresholds.whiteThreshold}`
    : "processing…";

  if (process.env.NODE_ENV !== "development") {
    return (
      <div
        style={{
          padding: 24,
          maxWidth: 960,
          margin: "0 auto",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <Link
            href="/"
            style={{
              color: "var(--rule)",
              fontSize: 14,
              textDecoration: "underline",
            }}
          >
            ← Back to game
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/"
          style={{
            color: "var(--rule)",
            fontSize: 14,
            textDecoration: "underline",
          }}
        >
          ← Back to game
        </Link>
      </div>

      <h1
        style={{
          fontFamily: "var(--font-unifraktur), cursive",
          color: "var(--ink)",
          marginBottom: 8,
        }}
      >
        Remove borders
      </h1>
      <p style={{ color: "var(--rule)", marginBottom: 24, fontSize: 14 }}>
        Pass 1 — flood-fills from image edges through near-black/white pixels.
        Pass 2 — removes any opaque fragments not connected to the main body.
        Thresholds are auto-detected from edge samples; sliders let you
        override.
      </p>

      {/* Controls */}
      <div
        style={{
          background: "var(--cream)",
          border: "1px solid var(--aged)",
          padding: "16px 20px",
          marginBottom: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* URL */}
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              color: "var(--ink)",
            }}
          >
            IMAGE URL (loc.gov only)
          </span>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://tile.loc.gov/…"
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SAMPLE_URLS.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => setUrl(s)}
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  border: "1px solid var(--aged)",
                  background: url === s ? "var(--ink)" : "var(--paper)",
                  color: url === s ? "var(--cream)" : "var(--rule)",
                  cursor: "pointer",
                }}
              >
                Sample {i + 1}
              </button>
            ))}
          </div>
        </label>

        {/* Auto-detected thresholds */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minHeight: 24,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              color: "var(--ink)",
            }}
          >
            AUTO-DETECTED
          </span>
          {detecting && (
            <span style={{ fontSize: 11, color: "var(--rule)" }}>
              sampling…
            </span>
          )}
          {detected && !detecting && (
            <>
              <Tag
                label="black ≤"
                value={detected.blackThreshold}
                auto={blackOverride === undefined}
              />
              <Tag
                label="white ≥"
                value={detected.whiteThreshold}
                auto={whiteOverride === undefined}
              />
              {(blackOverride !== undefined || whiteOverride !== undefined) && (
                <button
                  type="button"
                  onClick={() => {
                    setBlackSlider(detected.blackThreshold);
                    setWhiteSlider(detected.whiteThreshold);
                    setBlackOverride(undefined);
                    setWhiteOverride(undefined);
                  }}
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    border: "1px solid var(--aged)",
                    background: "transparent",
                    color: "var(--rule)",
                    cursor: "pointer",
                  }}
                >
                  reset to auto
                </button>
              )}
            </>
          )}
        </div>

        {/* Mode */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              color: "var(--ink)",
              marginBottom: 6,
            }}
          >
            MODE
          </div>
          <div style={{ display: "flex" }}>
            <ModeButton
              label="BLACK"
              active={mode === "black"}
              onClick={() => setMode("black")}
            />
            <ModeButton
              label="WHITE"
              active={mode === "white"}
              onClick={() => setMode("white")}
            />
            <ModeButton
              label="BOTH"
              active={mode === "both"}
              onClick={() => setMode("both")}
            />
          </div>
        </div>

        {/* Black threshold */}
        {showBlack && (
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                color: "var(--ink)",
              }}
            >
              BLACK THRESHOLD — {blackSlider}
              {blackOverride === undefined && detected && (
                <span style={{ fontWeight: 400, color: "var(--rule)" }}>
                  {" "}
                  (auto)
                </span>
              )}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="range"
                min={0}
                max={120}
                value={blackSlider}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setBlackSlider(v);
                  setBlackOverride(v);
                }}
                style={{ flex: 1 }}
              />
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 16,
                  minWidth: 36,
                  textAlign: "right",
                  color: "var(--ink)",
                }}
              >
                {blackSlider}
              </span>
            </div>
          </label>
        )}

        {/* White threshold */}
        {showWhite && (
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                color: "var(--ink)",
              }}
            >
              WHITE THRESHOLD — {whiteSlider}
              {whiteOverride === undefined && detected && (
                <span style={{ fontWeight: 400, color: "var(--rule)" }}>
                  {" "}
                  (auto)
                </span>
              )}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="range"
                min={135}
                max={255}
                value={whiteSlider}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setWhiteSlider(v);
                  setWhiteOverride(v);
                }}
                style={{ flex: 1 }}
              />
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 16,
                  minWidth: 36,
                  textAlign: "right",
                  color: "var(--ink)",
                }}
              >
                {whiteSlider}
              </span>
            </div>
          </label>
        )}
      </div>

      {/* Before / After */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              color: "var(--rule)",
              marginBottom: 8,
            }}
          >
            BEFORE — original
          </div>
          <CheckerBg>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={url}
              src={url}
              alt="Original newspaper scan"
              style={{ width: "100%", display: "block" }}
            />
          </CheckerBg>
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              color: "var(--rule)",
              marginBottom: 8,
            }}
          >
            AFTER — {modeLabel}
            {processing && (
              <span style={{ fontWeight: 400, marginLeft: 8 }}>
                processing…
              </span>
            )}
          </div>
          <CheckerBg>
            {processedSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={processedSrc}
                alt="Processed newspaper scan with transparent border"
                style={{
                  width: "100%",
                  display: "block",
                  opacity: processing ? 0.4 : 1,
                  transition: "opacity 0.2s",
                }}
              />
            ) : (
              <div style={{ padding: 40, color: "var(--rule)", fontSize: 13 }}>
                {processing ? "Processing…" : "—"}
              </div>
            )}
          </CheckerBg>
        </div>
      </div>
    </div>
  );
}
