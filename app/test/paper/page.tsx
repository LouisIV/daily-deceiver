"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PaperTexture,
  PaperTextureFull,
  PaperTextureSimple,
  PaperTextureIOS,
  detectFilterRenders,
} from "@/lib/paper-texture-client";

const opacity = 0.25;
const intensity = 2;

function VariantCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--cream)",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        border: "1px solid var(--aged)",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--aged)",
          background: "var(--paper)",
        }}
      >
        <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "var(--rule)" }}>{description}</div>
      </div>
      <div
        style={{
          position: "relative",
          minHeight: 160,
          background: "var(--paper)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Georgia, serif",
            fontSize: 15,
            color: "var(--ink)",
          }}
        >
          Sample clipping text over the texture.
        </div>
        {children}
      </div>
    </div>
  );
}

export default function TestPaperPage() {
  const [filterRenders, setFilterRenders] = useState<boolean | null>(null);

  useEffect(() => {
    detectFilterRenders().then(setFilterRenders);
  }, []);

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
        maxWidth: 900,
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
        Paper texture variants
      </h1>
      <p style={{ color: "var(--rule)", marginBottom: 24, fontSize: 15 }}>
        Capability: filter renders ={" "}
        {filterRenders === null ? "…" : filterRenders ? "yes" : "no"}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <VariantCard
          title="1. Full (torn edges)"
          description="feTurbulence + feDiffuseLighting + feDisplacementMap + feBlend. Desktop only."
        >
          <PaperTextureFull opacity={opacity} intensity={intensity} />
        </VariantCard>

        <VariantCard
          title="2. Simple inline"
          description="feTurbulence + feDiffuseLighting only, inline SVG filter in DOM."
        >
          <PaperTextureSimple opacity={opacity} intensity={intensity} />
        </VariantCard>

        <VariantCard
          title="3. Tiled (data URI background)"
          description="Same filter inside an SVG used as CSS background-image, tiled."
        >
          <PaperTextureIOS opacity={opacity} intensity={intensity} />
        </VariantCard>

        <VariantCard
          title="4. Default (PaperTexture)"
          description="What the app uses: Full on desktop, Simple or Tiled on mobile based on detection."
        >
          <PaperTexture opacity={opacity} intensity={intensity}>
            <span />
          </PaperTexture>
        </VariantCard>
      </div>
    </div>
  );
}
