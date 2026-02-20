/**
 * Paper texture SVG filter effect.
 * Original: https://gist.github.com/pqoqubbw/983bc453255e28eb04749bc347c38401
 *
 * Usage:
 *   - React component: <PaperTexture /> from "@/lib/paper-texture-client"
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
