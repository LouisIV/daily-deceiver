"use client";

import { useState } from "react";
import Link from "next/link";
import { GRADES } from "@/lib/game/grades";
import { encodePapers } from "@/lib/game/share";

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
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--ink)" }}>
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
    "https://tile.loc.gov/image-services/iiif/service:ndnp:nbu:batch_nbu_fairbury_ver01:data:sn96080161:00206539215:1899033001:0532/full/pct:6.25/0/default.jpg"
  );
  const [paper2Url, setPaper2Url] = useState(
    "https://tile.loc.gov/image-services/iiif/service:ndnp:dlc:batch_dlc_triumph_ver02:data:sn83030214:00175036817:1898021701:0297/full/pct:3.125/0/default.jpg"
  );
  const [bust, setBust] = useState(0);
  const [textureEnabled, setTextureEnabled] = useState(true);
  const [textureIntensity, setTextureIntensity] = useState(80); // 0–100%, texture strength
  const [textureOpacity, setTextureOpacity] = useState(22); // 0–100%, overlay opacity

  const papers =
    numPapers === 0
      ? []
      : numPapers === 1
      ? [{ headline: "Paper One", imageUrl: paper1Url || undefined }]
      : [
          { headline: "Paper One", imageUrl: paper1Url || undefined },
          { headline: "Paper Two", imageUrl: paper2Url || undefined },
        ];

  const params = new URLSearchParams({
    score: String(score),
    total: String(total),
    grade,
    _bust: String(bust),
  });
  if (papers.length > 0) params.set("papers", encodePapers(papers));
  if (!textureEnabled) params.set("texture", "0");
  params.set("textureIntensity", String(textureIntensity / 100));
  params.set("textureOpacity", String(textureOpacity / 100));
  const imageUrl = `/api/og-share?${params.toString()}`;

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/" style={{ color: "var(--rule)", fontSize: 14, textDecoration: "underline" }}>
          ← Back to game
        </Link>
      </div>

      <h1 style={{ fontFamily: "var(--font-unifraktur), cursive", color: "var(--ink)", marginBottom: 20 }}>
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
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", letterSpacing: 1 }}>
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
              <span style={{ fontFamily: "monospace", fontSize: 18, minWidth: 36, textAlign: "right", color: "var(--ink)" }}>
                {score}
              </span>
            </div>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", letterSpacing: 1 }}>
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
              <span style={{ fontFamily: "monospace", fontSize: 18, minWidth: 36, textAlign: "right", color: "var(--ink)" }}>
                {total}
              </span>
            </div>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", letterSpacing: 1 }}>
              GRADE
            </span>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              style={{ ...inputStyle, fontSize: 13 }}
            >
              {GRADES.map((g) => (
                <option key={g.title} value={g.title}>{g.title}</option>
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
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", letterSpacing: 1 }}>
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
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", letterSpacing: 1 }}>
              PAPER TEXTURE
            </span>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={textureEnabled}
                onChange={(e) => setTextureEnabled(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontSize: 13, color: "var(--ink)" }}>Enable paper texture on clips</span>
            </label>
            {textureEnabled && (
              <>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--rule)" }}>
                    Intensity: {textureIntensity}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={textureIntensity}
                    onChange={(e) => setTextureIntensity(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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

          <button
            onClick={() => setBust((b) => b + 1)}
            style={{
              padding: "8px 16px",
              background: "var(--ink)",
              color: "var(--cream)",
              border: "none",
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
              fontSize: 13,
              letterSpacing: 1,
            }}
          >
            REFRESH IMAGE
          </button>

          <div style={{ fontSize: 12, color: "var(--rule)", borderTop: "1px solid var(--aged)", paddingTop: 12 }}>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>API URL</div>
            <code style={{ wordBreak: "break-all", fontSize: 11 }}>{imageUrl}</code>
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
