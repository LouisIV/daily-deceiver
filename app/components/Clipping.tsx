"use client";

import type { LayoutType, Round } from "@/lib/game/types";

export function Clipping({
  snippet,
  layout,
  index,
}: {
  snippet: Round;
  layout: LayoutType;
  index: number;
}) {
  const rot = [-0.6, 0.5, -0.4, 0.7, -0.3, 0.4][index % 6];

  const cardStyle = {
    background: "var(--cream)",
    border: "1px solid #c8b080",
    boxShadow: "2px 3px 0 #bfa870, 4px 7px 22px rgba(0,0,0,0.14)",
    padding: "28px 32px",
    marginBottom: 8,
    transform: `rotate(${rot}deg)`,
    transition: "transform 0.4s cubic-bezier(.2,.8,.4,1)",
    position: "relative" as const,
    overflow: "hidden" as const,
  };

  const stain = (
    <div
      style={{
        position: "absolute",
        top: -30,
        right: -20,
        width: 120,
        height: 120,
        borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(180,140,60,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }}
    />
  );

  if (layout === "broadside")
    return (
      <div style={cardStyle}>
        {stain}
        <hr className="rule-thick" />
        <hr className="rule-thin" style={{ marginTop: 2, marginBottom: 10 }} />

        <div
          className="headline"
          style={{
            fontSize: "clamp(18px,3.5vw,26px)",
            textAlign: "center",
            marginBottom: 6,
          }}
        >
          {snippet.headline}
        </div>

        <hr className="rule-thin" style={{ marginBottom: 10 }} />

        <p className="clipping-body drop-cap">{snippet.text}</p>

        <hr className="rule-thin" style={{ marginTop: 12 }} />
        <hr className="rule-thick" style={{ marginTop: 2 }} />
      </div>
    );

  if (layout === "column")
    return (
      <div style={cardStyle}>
        {stain}
        <div style={{ display: "flex", gap: 20 }}>
          <div
            style={{
              width: 90,
              flexShrink: 0,
              borderRight: "1px solid var(--ink)",
              paddingRight: 16,
              paddingTop: 4,
            }}
          >
            <div
              className="subhead"
              style={{ fontSize: 9, marginBottom: 8, lineHeight: 1.4 }}
            >
              FROM OUR
              <br />
              CORRESPONDENT
            </div>
            <div className="ornament" style={{ fontSize: 22, textAlign: "center" }}>
              ❧
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              className="headline"
              style={{ fontSize: "clamp(15px,2.8vw,20px)", marginBottom: 8 }}
            >
              {snippet.headline}
            </div>
            <hr className="rule-thin" style={{ marginBottom: 8 }} />
            <p className="clipping-body">{snippet.text}</p>
          </div>
        </div>
      </div>
    );

  if (layout === "notice")
    return (
      <div style={{ ...cardStyle, textAlign: "center" }}>
        {stain}
        <div
          className="ornament"
          style={{ fontSize: 20, marginBottom: 6, letterSpacing: 8 }}
        >
          — ✦ —
        </div>

        <div className="subhead" style={{ marginBottom: 6 }}>
          Notice
        </div>
        <hr className="rule-thick" style={{ width: 60, margin: "0 auto 10px" }} />

        <div
          className="headline"
          style={{ fontSize: "clamp(16px,3vw,22px)", marginBottom: 10 }}
        >
          {snippet.headline}
        </div>

        <p
          className="clipping-body"
          style={{ textAlign: "center", maxWidth: 480, margin: "0 auto" }}
        >
          {snippet.text}
        </p>

        <div
          className="ornament"
          style={{ fontSize: 20, marginTop: 10, letterSpacing: 8 }}
        >
          — ✦ —
        </div>
      </div>
    );

  if (layout === "feature")
    return (
      <div style={cardStyle}>
        {stain}
        <hr className="rule-thick" />

        <div
          style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "8px 0" }}
        >
          <div
            className="headline"
            style={{
              fontSize: "clamp(20px,4vw,32px)",
              flex: 1,
              lineHeight: 1,
            }}
          >
            {snippet.headline}
          </div>
          <div className="ornament" style={{ fontSize: 28, flexShrink: 0 }}>
            ❦
          </div>
        </div>

        <hr className="rule-thin" style={{ marginBottom: 10 }} />

        <div
          style={{
            columnCount: 2,
            columnGap: 20,
            columnRule: "1px solid var(--ink)",
          }}
        >
          <p className="clipping-body drop-cap">{snippet.text}</p>
        </div>
      </div>
    );

  return (
    <div style={{ ...cardStyle, borderLeft: "4px solid var(--ink)" }}>
      {stain}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flexShrink: 0, width: 32, textAlign: "center" }}>
          <div className="ornament" style={{ fontSize: 24 }}>
            ☞
          </div>
        </div>
        <div>
          <div
            className="headline"
            style={{ fontSize: "clamp(13px,2.3vw,17px)", marginBottom: 6 }}
          >
            {snippet.headline}
          </div>
          <p className="clipping-body" style={{ fontSize: "clamp(12px,1.9vw,15px)" }}>
            {snippet.text}
          </p>
        </div>
      </div>
    </div>
  );
}
