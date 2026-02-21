import type { CSSProperties, ReactNode } from "react";
import type { SharePaper } from "../../../../lib/game/share";
import { paperTextureSvgString } from "../../../../lib/paper-texture";
import { upgradeLocImageUrl } from "../../../../lib/loc-image";

const DEFAULT_TEXTURE_STRENGTH = 0.8;

function getPaperTextureUrl(intensity: number): string {
  const strength = Math.max(0, Math.min(1, intensity));
  return `data:image/svg+xml;base64,${Buffer.from(
    paperTextureSvgString(400, 400, strength)
  ).toString("base64")}`;
}

const DEFAULT_PAPER_TEXTURE_URL = getPaperTextureUrl(DEFAULT_TEXTURE_STRENGTH);

/**
 * Wraps content in a container with a paper texture overlay.
 * Parent must have overflow:hidden and (for image case) alignItems:"flex-start".
 */
function withPaperTexture(
  children: ReactNode,
  textureUrl: string,
  opacity: number,
  wrapperStyle?: CSSProperties
) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        ...wrapperStyle,
      }}
    >
      {children}
      <img
        src={textureUrl}
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity,
          mixBlendMode: "multiply",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/**
 * Renders a newspaper page image cropped to the top.
 * Uses natural image height + overflow:hidden on the parent to avoid
 * objectPosition (unsupported in Satori). Parent must have overflow:hidden
 * and alignItems:"flex-start".
 */
const DEFAULT_TEXTURE_OPACITY = 0.22;

export function PaperImage({
  paper,
  fallbackFontSize = 14,
  textureEnabled = true,
  textureIntensity,
  textureOpacity = DEFAULT_TEXTURE_OPACITY,
}: {
  paper: SharePaper;
  fallbackFontSize?: number;
  textureEnabled?: boolean;
  textureIntensity?: number;
  textureOpacity?: number;
}) {
  const strength = textureIntensity ?? DEFAULT_TEXTURE_STRENGTH;
  const textureUrl =
    strength === DEFAULT_TEXTURE_STRENGTH
      ? DEFAULT_PAPER_TEXTURE_URL
      : getPaperTextureUrl(strength);
  const opacity = Math.max(0, Math.min(1, textureOpacity ?? DEFAULT_TEXTURE_OPACITY));

  if (paper.imageUrl) {
    const content = (
      <img src={upgradeLocImageUrl(paper.imageUrl, 800)} style={{ width: "100%" }} />
    );
    return textureEnabled
      ? withPaperTexture(content, textureUrl, opacity)
      : content;
  }

  const fallbackContent = (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: '"Playfair Display", serif',
          fontWeight: 700,
          fontSize: `${fallbackFontSize}px`,
          color: "#1c1008",
          textAlign: "center",
        }}
      >
        {paper.headline}
      </div>
    </div>
  );
  return textureEnabled
    ? withPaperTexture(fallbackContent, textureUrl, opacity, { flex: 1, display: "flex" })
    : <div style={{ flex: 1, display: "flex" }}>{fallbackContent}</div>;
}
