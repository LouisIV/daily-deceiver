/**
 * Paper texture SVG filter effect.
 * Original: https://gist.github.com/pqoqubbw/983bc453255e28eb04749bc347c38401
 *
 * Usage:
 *   - React component: <PaperTexture /> inside a position:relative container
 *   - OG images / server: paperTextureSvgString() → base64 encode → use as img src
 */

export function paperTextureSvgString(
  width = 1200,
  height = 630,
  intensity = 1
): string {
  const surfaceScale = Math.max(0.1, 2 * intensity);
  const displacementScale = Math.max(0, 10 * intensity);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><filter id="p"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/><feDiffuseLighting in="noise" lightingColor="#fff" surfaceScale="${surfaceScale}" result="texture"><feDistantLight azimuth="45" elevation="60"/></feDiffuseLighting><feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="3" seed="5" result="tornNoise"/><feDisplacementMap in="SourceGraphic" in2="tornNoise" scale="${displacementScale}" xChannelSelector="R" yChannelSelector="G" result="tornEdges"/><feBlend in="texture" in2="tornEdges" mode="multiply"/></filter></defs><rect width="100%" height="100%" fill="#fff" filter="url(#p)"/></svg>`;
}

/** 
 * PaperTexture wrapper component.
 * Renders children in a position:relative container,
 * overlayed with an SVG paper texture.
 */
import { ReactNode } from "react";

export function PaperTexture({
  opacity = 0.18,
  intensity = 1,
  children,
  style = {},
}: {
  opacity?: number;
  /** Paper relief and torn-edge strength. 1 = default, 0 = minimal, >1 = stronger. */
  intensity?: number;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  const surfaceScale = Math.max(0.1, 2 * intensity);
  const displacementScale = Math.max(0, 10 * intensity);
  return (
    <div style={{ position: "relative", ...style }}>
      {children}
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
        }}
      >
        <defs>
          <filter id="paper-texture">
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
        <rect width="100%" height="100%" fill="white" filter="url(#paper-texture)" />
      </svg>
    </div>
  );
}
