/**
 * Paper texture SVG filter effect.
 * Original: https://gist.github.com/pqoqubbw/983bc453255e28eb04749bc347c38401
 *
 * Usage:
 *   - React component: <PaperTexture /> inside a position:relative container
 *   - OG images / server: paperTextureSvgString() → base64 encode → use as img src
 */

export function paperTextureSvgString(width = 1200, height = 630): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><filter id="p"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/><feDiffuseLighting in="noise" lightingColor="#fff" surfaceScale="2" result="texture"><feDistantLight azimuth="45" elevation="60"/></feDiffuseLighting><feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="3" seed="5" result="tornNoise"/><feDisplacementMap in="SourceGraphic" in2="tornNoise" scale="10" xChannelSelector="R" yChannelSelector="G" result="tornEdges"/><feBlend in="texture" in2="tornEdges" mode="multiply"/></filter></defs><rect width="100%" height="100%" fill="#fff" filter="url(#p)"/></svg>`;
}

/** Drop-in React component. Parent must have position:relative (or absolute/fixed). */
export function PaperTexture({ opacity = 0.18 }: { opacity?: number }) {
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
            surfaceScale={2}
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
            scale={10}
            xChannelSelector="R"
            yChannelSelector="G"
            result="tornEdges"
          />
          <feBlend in="texture" in2="tornEdges" mode="multiply" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="white" filter="url(#paper-texture)" />
    </svg>
  );
}
