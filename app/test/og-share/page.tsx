"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { GRADES } from "@/lib/game/grades";
import { encodeSharePayload } from "@/lib/game/share";

const GZIP_MAGIC = new Uint8Array([0x1f, 0x8b]);

/** Detect share token format from the hash string (client-side, no secret). */
function getShareTokenKind(hash: string): "legacy" | "gzip" | "encrypted" {
  if (!hash?.length) return "legacy";
  try {
    let b64 = hash.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (
      bytes.length >= 2 &&
      bytes[0] === GZIP_MAGIC[0] &&
      bytes[1] === GZIP_MAGIC[1]
    ) {
      return "gzip";
    }
    if (bytes.length >= 28) {
      return "encrypted";
    }
    const decoded = decodeURIComponent(
      Array.from(bytes)
        .map((b) => String.fromCharCode(b))
        .join(""),
    );
    JSON.parse(decoded);
    return "legacy";
  } catch {
    return "encrypted";
  }
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

function PaperFields({
  label,
  imageUrl,
  onImageUrl,
}: {
  label: string;
  imageUrl: string;
  onImageUrl: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "10px 12px",
        border: "1px solid var(--aged)",
        background: "var(--paper)",
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
        {label}
      </span>
      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 11, color: "var(--rule)" }}>Image URL</span>
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => onImageUrl(e.target.value)}
          placeholder="https://tile.loc.gov/…"
          style={inputStyle}
        />
      </label>
    </div>
  );
}

export default function TestOgSharePage() {
  const [score, setScore] = useState(7);
  const [total, setTotal] = useState(10);
  const [grade, setGrade] = useState(GRADES[1].title);
  const [numPapers, setNumPapers] = useState<0 | 1 | 2>(0);
  const [paper1Url, setPaper1Url] = useState(
    "https://tile.loc.gov/image-services/iiif/service:ndnp:nbu:batch_nbu_fairbury_ver01:data:sn96080161:00206539215:1899033001:0532/full/pct:6.25/0/default.jpg",
  );
  const [paper2Url, setPaper2Url] = useState(
    "https://tile.loc.gov/image-services/iiif/service:ndnp:dlc:batch_dlc_triumph_ver02:data:sn83030214:00175036817:1898021701:0297/full/pct:3.125/0/default.jpg",
  );
  const [textureEnabled, setTextureEnabled] = useState(true);
  const [textureIntensity, setTextureIntensity] = useState(80); // 0–100%, texture strength
  const [textureOpacity, setTextureOpacity] = useState(22); // 0–100%, overlay opacity
  const [useServerEncode, setUseServerEncode] = useState(false);
  const [serverHash, setServerHash] = useState<string | null>(null);

  const papers =
    numPapers === 0
      ? []
      : numPapers === 1
        ? [{ headline: "Paper One", imageUrl: paper1Url || undefined }]
        : [
            { headline: "Paper One", imageUrl: paper1Url || undefined },
            { headline: "Paper Two", imageUrl: paper2Url || undefined },
          ];

  const clientHash = encodeSharePayload({
    score,
    total,
    grade,
    papers,
    texture: textureEnabled,
    textureIntensity: textureIntensity / 100,
    textureOpacity: textureOpacity / 100,
  });

  const hash = useServerEncode && serverHash != null ? serverHash : clientHash;
  const imageUrl = `/api/og-share?h=${encodeURIComponent(hash)}`;
  const tokenKind = getShareTokenKind(hash);

  const payloadKey = useMemo(
    () =>
      JSON.stringify({
        score,
        total,
        grade,
        papers,
        textureEnabled,
        textureIntensity,
        textureOpacity,
      }),
    [score, total, grade, numPapers, paper1Url, paper2Url, textureEnabled, textureIntensity, textureOpacity],
  );

  useEffect(() => {
    if (!useServerEncode) {
      setServerHash(null);
      return;
    }
    let cancelled = false;
    const payload = {
      score,
      total,
      grade,
      papers,
      texture: textureEnabled,
      textureIntensity: textureIntensity / 100,
      textureOpacity: textureOpacity / 100,
    };
    fetch("/api/share/encode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { h?: string } | null) => {
        if (!cancelled && data?.h) setServerHash(data.h);
      })
      .catch(() => {
        if (!cancelled) setServerHash(null);
      });
    return () => {
      cancelled = true;
    };
  }, [useServerEncode, payloadKey]);

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

      <h1
        style={{
          fontFamily: "var(--font-unifraktur), cursive",
          color: "var(--ink)",
          marginBottom: 20,
        }}
      >
        OG Share Image Preview
      </h1>

      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        {/* Controls */}
        <div
          style={{
            background: "var(--cream)",
            border: "1px solid var(--aged)",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minWidth: 280,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--ink)",
                letterSpacing: 1,
              }}
            >
              SCORE
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range"
                min={0}
                max={total}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 18,
                  minWidth: 36,
                  textAlign: "right",
                  color: "var(--ink)",
                }}
              >
                {score}
              </span>
            </div>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--ink)",
                letterSpacing: 1,
              }}
            >
              TOTAL
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range"
                min={1}
                max={20}
                value={total}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  setTotal(t);
                  if (score > t) setScore(t);
                }}
                style={{ flex: 1 }}
              />
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 18,
                  minWidth: 36,
                  textAlign: "right",
                  color: "var(--ink)",
                }}
              >
                {total}
              </span>
            </div>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--ink)",
                letterSpacing: 1,
              }}
            >
              GRADE
            </span>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              style={{ ...inputStyle, fontSize: 13 }}
            >
              {GRADES.map((g) => (
                <option key={g.title} value={g.title}>
                  {g.title}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="or type a custom grade…"
              style={{ ...inputStyle, fontSize: 13 }}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--ink)",
                letterSpacing: 1,
              }}
            >
              PAPERS
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {([0, 1, 2] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumPapers(n)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    border: "1px solid var(--ink)",
                    background: numPapers === n ? "var(--ink)" : "var(--paper)",
                    color: numPapers === n ? "var(--cream)" : "var(--ink)",
                    cursor: "pointer",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: numPapers === n ? 700 : 400,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            {numPapers >= 1 && (
              <PaperFields
                label="PAPER 1"
                imageUrl={paper1Url}
                onImageUrl={setPaper1Url}
              />
            )}
            {numPapers >= 2 && (
              <PaperFields
                label="PAPER 2"
                imageUrl={paper2Url}
                onImageUrl={setPaper2Url}
              />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--ink)",
                letterSpacing: 1,
              }}
            >
              PAPER TEXTURE
            </span>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={textureEnabled}
                onChange={(e) => setTextureEnabled(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontSize: 13, color: "var(--ink)" }}>
                Enable paper texture on clips
              </span>
            </label>
            {textureEnabled && (
              <>
                <label
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <span style={{ fontSize: 11, color: "var(--rule)" }}>
                    Intensity: {textureIntensity}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={textureIntensity}
                    onChange={(e) =>
                      setTextureIntensity(Number(e.target.value))
                    }
                    style={{ width: "100%" }}
                  />
                </label>
                <label
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <span style={{ fontSize: 11, color: "var(--rule)" }}>
                    Opacity: {textureOpacity}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={textureOpacity}
                    onChange={(e) => setTextureOpacity(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </label>
              </>
            )}
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={useServerEncode}
              onChange={(e) => setUseServerEncode(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 13, color: "var(--ink)" }}>
              Use server encode (compressed + encrypted when secret set)
            </span>
          </label>

          <div
            style={{
              fontSize: 12,
              color: "var(--rule)",
              borderTop: "1px solid var(--aged)",
              paddingTop: 12,
            }}
          >
            <div style={{ marginBottom: 4, fontWeight: 600 }}>Token</div>
            <div
              style={{
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  background:
                    tokenKind === "encrypted"
                      ? "var(--ink)"
                      : tokenKind === "gzip"
                        ? "rgba(28, 16, 8, 0.5)"
                        : "var(--aged)",
                  color:
                    tokenKind === "encrypted" ? "var(--cream)" : "var(--ink)",
                }}
              >
                {tokenKind === "encrypted"
                  ? "Encrypted"
                  : tokenKind === "gzip"
                    ? "Compressed (gzip)"
                    : "Legacy (plain)"}
              </span>
            </div>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>API URL</div>
            <code style={{ wordBreak: "break-all", fontSize: 11 }}>
              {imageUrl}
            </code>
          </div>
        </div>

        {/* Image preview */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ fontSize: 13, color: "var(--rule)", marginBottom: 8 }}>
            1200 × 630 — scaled to fit
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={imageUrl}
            src={imageUrl}
            alt="OG share preview"
            style={{
              width: "100%",
              border: "1px solid var(--aged)",
              display: "block",
            }}
          />
        </div>
      </div>
    </div>
  );
}
