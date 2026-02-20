"use client";

/**
 * Paper texture overlay (inline SVG filters).
 *
 * Support (caniuse):
 * - SVG filters: https://caniuse.com/svg-filters — supported Safari iOS 6+, all modern.
 * - feTurbulence: https://caniuse.com/mdn-svg_elements_feturbulence — Safari iOS 6+.
 * - feDiffuseLighting: https://caniuse.com/mdn-svg_elements_fediffuselighting — Safari iOS 6+.
 * - feDisplacementMap: https://caniuse.com/mdn-svg_elements_fedisplacementmap — Safari iOS 6+.
 *
 * Real-world: On iOS, inline SVG filters (same document) render; the same SVG used as
 * CSS background-image or drawn to canvas often does not apply the filter (flat/blank).
 * So we use Full (with feDisplacementMap) on desktop only; on iOS we use Simple (inline only).
 */

import { ReactNode, useId } from "react";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Build the paper texture SVG string (same filter as simple inline). */
function paperTextureSvgString(intensity: number): string {
  const surfaceScale = Math.max(0.1, 2 * intensity);
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">',
    "<defs>",
    '<filter id="n" x="0" y="0" width="100%" height="100%">',
    '<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/>',
    `<feDiffuseLighting in="noise" lighting-color="#fff" surfaceScale="${surfaceScale}">`,
    '<feDistantLight azimuth="45" elevation="60"/>',
    "</feDiffuseLighting>",
    "</filter>",
    "</defs>",
    '<rect width="256" height="256" fill="#fff" filter="url(%23n)"/>',
    "</svg>",
  ].join("");
}

/** Data URI for CSS (tiled background). */
function paperTextureDataUri(intensity: number): string {
  const dataUri = `data:image/svg+xml,${encodeURIComponent(paperTextureSvgString(intensity))}`;
  return `url("${dataUri.replace(/"/g, "%22")}")`;
}

/** Detect if the paper filter actually renders (pixel variation). Runs async. */
export function detectFilterRenders(): Promise<boolean> {
  return new Promise((resolve) => {
    const dataUri = `data:image/svg+xml,${encodeURIComponent(paperTextureSvgString(1))}`;
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(false);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let min = 255,
          max = 0;
        for (let i = 0; i < data.length; i += 4) {
          const g = data[i + 1];
          if (g < min) min = g;
          if (g > max) max = g;
        }
        const range = max - min;
        resolve(range > 2);
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = dataUri;
  });
}

/** iOS fallback: tiled background image (avoids Safari's broken inline SVG filter support). */
export function PaperTextureIOS({
  opacity = 0.18,
  intensity = 1,
  style: styleOverrides = {},
}: {
  opacity?: number;
  intensity?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity,
        zIndex: 1,
        backgroundImage: paperTextureDataUri(intensity),
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
        transform: "translateZ(0)",
        ...styleOverrides,
      }}
    />
  );
}

/** Simple rough-paper filter (inline SVG). Used on non-iOS or if we ever want to try again on iOS. */
export function PaperTextureSimple({
  opacity = 0.18,
  intensity = 1,
  style: styleOverrides = {},
  filterId,
}: {
  opacity?: number;
  intensity?: number;
  style?: React.CSSProperties;
  filterId?: string;
}) {
  const surfaceScale = Math.max(0.1, 2 * intensity);
  const id = filterId ?? "paper-texture-rough";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity,
        zIndex: 1,
        transform: "translateZ(0)",
        ...styleOverrides,
      }}
    >
      <defs>
        <filter
          id={id}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04"
            result="noise"
            numOctaves={5}
          />
          <feDiffuseLighting
            in="noise"
            lightingColor="#fff"
            surfaceScale={surfaceScale}
            result="lit"
          >
            <feDistantLight azimuth={45} elevation={60} />
          </feDiffuseLighting>
        </filter>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="white"
        filter={`url(#${id})`}
        style={{ transform: "translateZ(0)" }}
      />
    </svg>
  );
}

/** Full paper texture with torn edges (desktop). */
export function PaperTextureFull({
  opacity = 0.18,
  intensity = 1,
  style: styleOverrides = {},
  filterId,
}: {
  opacity?: number;
  intensity?: number;
  style?: React.CSSProperties;
  filterId?: string;
}) {
  const surfaceScale = Math.max(0.1, 2 * intensity);
  const displacementScale = Math.max(0, 10 * intensity);
  const id = filterId ?? "paper-texture";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity,
        zIndex: 1,
        ...styleOverrides,
      }}
    >
      <defs>
        <filter id={id}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04"
            numOctaves={5}
            result="noise"
          />
          <feDiffuseLighting
            in="noise"
            lightingColor="#fff"
            surfaceScale={surfaceScale}
            result="texture"
          >
            <feDistantLight azimuth={45} elevation={60} />
          </feDiffuseLighting>
          <feTurbulence
            type="turbulence"
            baseFrequency="0.05"
            numOctaves={3}
            seed={5}
            result="tornNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="tornNoise"
            scale={displacementScale}
            xChannelSelector="R"
            yChannelSelector="G"
            result="tornEdges"
          />
          <feBlend in="texture" in2="tornEdges" mode="multiply" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="white" filter={`url(#${id})`} />
    </svg>
  );
}

/** PaperTexture wrapper. Full (torn edges) on desktop; simple inline filter on iOS/mobile (tiled data-URI doesn't render there). */
export function PaperTexture({
  opacity = 0.18,
  intensity = 1,
  /** Override opacity on iOS (simple filter reads subtler; use higher value). */
  opacityIOS,
  /** Override intensity on iOS. */
  intensityIOS,
  children,
  style = {},
}: {
  opacity?: number;
  /** Paper relief and torn-edge strength. 1 = default, 0 = minimal, >1 = stronger. */
  intensity?: number;
  opacityIOS?: number;
  intensityIOS?: number;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  const isDesktop = !isIOS();
  const filterId = useId().replace(/:/g, "-");
  const effectiveOpacity = isDesktop ? opacity : (opacityIOS ?? opacity);
  const effectiveIntensity = isDesktop ? intensity : (intensityIOS ?? intensity);

  return (
    <div style={{ position: "relative", isolation: "isolate", ...style }}>
      <div style={{ position: "relative", zIndex: 0 }}>
        {children}
      </div>
      {isDesktop ? (
        <PaperTextureFull opacity={effectiveOpacity} intensity={effectiveIntensity} filterId={filterId} />
      ) : (
        <PaperTextureSimple opacity={effectiveOpacity} intensity={effectiveIntensity} filterId={filterId} />
      )}
    </div>
  );
}
