"use client";

import { useState } from "react";
import Link from "next/link";

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

function LinkPreviewCard({
  title,
  description,
  image,
  url,
  platform,
}: {
  title: string;
  description: string;
  image: string;
  url: string;
  platform: "discord" | "twitter" | "facebook";
}) {
  if (platform === "discord") {
    return (
      <div
        style={{
          border: "1px solid var(--aged)",
          borderRadius: 8,
          overflow: "hidden",
          background: "#2c2f33",
          maxWidth: 500,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={title}
          style={{
            width: "100%",
            height: "300px",
            objectFit: "cover",
            display: "block",
          }}
        />
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#ffffff",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 13, color: "#b9bbbe" }}>{description}</div>
          <div
            style={{
              fontSize: 12,
              color: "#72767d",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {url}
          </div>
        </div>
      </div>
    );
  }

  if (platform === "twitter") {
    return (
      <div
        style={{
          border: "1px solid #e1e8ed",
          borderRadius: 16,
          overflow: "hidden",
          background: "#ffffff",
          maxWidth: 500,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={title}
          style={{
            width: "100%",
            height: "260px",
            objectFit: "cover",
            display: "block",
          }}
        />
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, color: "#657786" }}>
            {url.replace(/^https?:\/\//, "")}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#0f1419",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#536471",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #e4e6eb",
        borderRadius: 8,
        overflow: "hidden",
        background: "#ffffff",
        maxWidth: 500,
        display: "flex",
        flexDirection: "row",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt={title}
        style={{
          width: "160px",
          height: "160px",
          objectFit: "cover",
          display: "block",
          flexShrink: 0,
        }}
      />
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <div style={{ fontSize: 12, color: "#65676b" }}>
          {url.replace(/^https?:\/\//, "").split("/")[0]}
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "#050505",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#65676b",
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}

export default function TestOgPreviewPage() {
  const [url, setUrl] = useState("https://daily-deceiver.vercel.app");
  const [title, setTitle] = useState("I scored 7/10 — B");
  const [description, setDescription] = useState("How well can you spot fake news? Test your critical thinking skills in this fun newspaper game.");

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/test" style={{ color: "var(--rule)", fontSize: 14, textDecoration: "underline" }}>
          ← Back to tests
        </Link>
      </div>

      <h1 style={{ fontFamily: "var(--font-unifraktur), cursive", color: "var(--ink)", marginBottom: 8 }}>
        OG Link Preview
      </h1>
      <p style={{ color: "var(--rule)", marginBottom: 24, fontSize: 15 }}>
        Preview how your link appears when shared on social platforms:
      </p>

      <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
        {/* Controls */}
        <div
          style={{
            background: "var(--cream)",
            border: "1px solid var(--aged)",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minWidth: 280,
            maxWidth: 320,
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--ink)" }}>
              URL
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--ink)" }}>
              TITLE
            </span>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                ...inputStyle,
                minHeight: 50,
                fontFamily: "system-ui, sans-serif",
                resize: "vertical",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--ink)" }}>
              DESCRIPTION
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                ...inputStyle,
                minHeight: 60,
                fontFamily: "system-ui, sans-serif",
                resize: "vertical",
              }}
            />
          </label>
        </div>

        {/* Previews */}
        <div style={{ flex: 1, minWidth: 300, display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--rule)", marginBottom: 12 }}>
              DISCORD
            </div>
            <LinkPreviewCard
              title={title}
              description={description}
              image="/api/og-share"
              url={url}
              platform="discord"
            />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--rule)", marginBottom: 12 }}>
              TWITTER / X
            </div>
            <LinkPreviewCard
              title={title}
              description={description}
              image="/api/og-share"
              url={url}
              platform="twitter"
            />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "var(--rule)", marginBottom: 12 }}>
              FACEBOOK
            </div>
            <LinkPreviewCard
              title={title}
              description={description}
              image="/api/og-share"
              url={url}
              platform="facebook"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
