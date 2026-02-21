import sharp from "sharp";

// ─── Private helpers ──────────────────────────────────────────────────────────

/** Decode any image buffer to raw RGBA pixels. Single sharp decode shared by
 *  detection + fill so we only pay the decode cost once. */
async function decodeRgba(
  input: Buffer | ArrayBuffer
): Promise<{ px: Buffer; width: number; height: number }> {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { px: data as Buffer, width: info.width, height: info.height };
}

async function encodePng(
  px: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  return sharp(px, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/**
 * Samples every pixel on the outermost ring of the image and returns
 * thresholds calibrated to the actual border tones found there.
 *
 * Strategy:
 *  • "black" detection uses max(R,G,B) per pixel — all channels low = dark.
 *  • "white" detection uses min(R,G,B) per pixel — all channels high = bright.
 *  • If ≥20% of edge pixels form a dark cluster, set blackThreshold to the
 *    95th-percentile of those values + 20 slack (handles JPEG artifacts).
 *  • Same logic inverted for white.
 *  • Falls back to conservative defaults if no strong cluster is found.
 */
function detectThresholdsFromRgba(
  px: Buffer,
  width: number,
  height: number
): { blackThreshold: number; whiteThreshold: number } {
  const maxChs: number[] = []; // max(R,G,B) — low means dark
  const minChs: number[] = []; // min(R,G,B) — high means bright

  function sample(x: number, y: number) {
    const off = (y * width + x) * 4;
    const r = px[off], g = px[off + 1], b = px[off + 2];
    maxChs.push(Math.max(r, g, b));
    minChs.push(Math.min(r, g, b));
  }

  for (let x = 0; x < width; x++) {
    sample(x, 0);
    sample(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    sample(0, y);
    sample(width - 1, y);
  }

  const n = maxChs.length;
  const SLACK = 20;

  // Dark cluster: max(R,G,B) < 128
  const dark = maxChs.filter(v => v < 128).sort((a, b) => a - b);
  let blackThreshold = 40;
  if (dark.length / n >= 0.2) {
    const p95 = dark[Math.min(Math.floor(dark.length * 0.95), dark.length - 1)];
    blackThreshold = Math.min(p95 + SLACK, 100);
  }

  // Bright cluster: min(R,G,B) > 128
  const bright = minChs.filter(v => v > 128).sort((a, b) => a - b);
  let whiteThreshold = 215;
  if (bright.length / n >= 0.2) {
    const p5 = bright[Math.max(Math.floor(bright.length * 0.05), 0)];
    whiteThreshold = Math.max(p5 - SLACK, 155);
  }

  return { blackThreshold, whiteThreshold };
}

/**
 * Pass 1 — flood-fill from every edge pixel inward through pixels that
 * satisfy `isBorder`, making each fully transparent.
 *
 * Depth guard: the fill is hard-stopped at `maxDepth` pixels from the
 * nearest image edge (= min(x, y, w−1−x, h−1−y)). This guarantees the
 * operation can never punch through to the interior of the image, even if a
 * thin path of near-black/white pixels connects the border to newspaper
 * content (e.g. a black rule touching a black film edge).
 *
 * Default maxDepth = 2% of image width — newspaper borders are never wider
 * than that, so anything deeper is guaranteed to be content.
 */
function fillEdgesInPlace(
  px: Buffer,
  width: number,
  height: number,
  isBorder: (r: number, g: number, b: number) => boolean,
  maxDepth = Math.round(width * 0.02)
): void {
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];

  function examine(idx: number) {
    if (visited[idx]) return;
    visited[idx] = 1;
    // Distance from the nearest edge — refuse to go deeper than maxDepth.
    const x = idx % width;
    const y = (idx - x) / width;
    if (Math.min(x, y, width - 1 - x, height - 1 - y) > maxDepth) return;
    const off = idx * 4;
    if (isBorder(px[off], px[off + 1], px[off + 2])) stack.push(idx);
  }

  for (let x = 0; x < width; x++) {
    examine(x);
    examine((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    examine(y * width);
    examine(y * width + width - 1);
  }

  while (stack.length > 0) {
    const idx = stack.pop()!;
    px[idx * 4 + 3] = 0;
    const x = idx % width;
    const y = (idx - x) / width;
    if (y > 0)           examine(idx - width);
    if (y < height - 1)  examine(idx + width);
    if (x > 0)           examine(idx - 1);
    if (x < width - 1)   examine(idx + 1);
  }
}

/**
 * Pass 2 — finds the "main body" by flood-filling from the opaque pixel
 * closest to the image center, then erases every opaque pixel that isn't
 * 4-connected to that body.
 *
 * This removes detached fragments (opaque islands near the edges that were
 * separated from the newspaper content by the transparent border cut in
 * pass 1) without touching the main content.
 */
function removeDetachedFragmentsInPlace(
  px: Buffer,
  width: number,
  height: number
): void {
  const total = width * height;
  const cx = width / 2;
  const cy = height / 2;

  // Find the opaque pixel closest to the image centre (= main body seed).
  let seedIdx = -1;
  let seedDist = Infinity;
  for (let i = 0; i < total; i++) {
    if (px[i * 4 + 3] > 0) {
      const x = i % width;
      const y = (i - x) / width;
      const dist = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (dist < seedDist) { seedDist = dist; seedIdx = i; }
    }
  }

  if (seedIdx < 0) return; // entire image is already transparent

  // DFS through connected opaque pixels from the seed.
  const mainBody = new Uint8Array(total);
  mainBody[seedIdx] = 1;
  const stack = [seedIdx];

  while (stack.length > 0) {
    const idx = stack.pop()!;
    const x = idx % width;
    const y = (idx - x) / width;

    const ns = [
      y > 0            ? idx - width : -1,
      y < height - 1   ? idx + width : -1,
      x > 0            ? idx - 1     : -1,
      x < width - 1    ? idx + 1     : -1,
    ];
    for (const n of ns) {
      if (n >= 0 && !mainBody[n] && px[n * 4 + 3] > 0) {
        mainBody[n] = 1;
        stack.push(n);
      }
    }
  }

  // Anything opaque that isn't the main body → transparent.
  for (let i = 0; i < total; i++) {
    if (px[i * 4 + 3] > 0 && !mainBody[i]) px[i * 4 + 3] = 0;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Samples the image's edge pixels and returns calibrated thresholds for
 * black and white border removal. Useful for previewing what auto-detection
 * would choose before actually processing.
 */
export async function detectBorderThresholds(
  input: Buffer | ArrayBuffer
): Promise<{ blackThreshold: number; whiteThreshold: number }> {
  const { px, width, height } = await decodeRgba(input);
  return detectThresholdsFromRgba(px, width, height);
}

/**
 * Removes near-black border pixels connected to the image edge, then erases
 * any detached opaque fragments not connected to the main body.
 * Returns a PNG with an alpha channel.
 *
 * @param threshold Explicit max R/G/B for "black". Omit to auto-detect.
 */
export async function removeBlackBorders(
  input: Buffer | ArrayBuffer,
  threshold?: number
): Promise<{ png: Buffer; blackThreshold: number; whiteThreshold: number }> {
  const { px, width, height } = await decodeRgba(input);
  const detected = detectThresholdsFromRgba(px, width, height);
  const bt = threshold ?? detected.blackThreshold;
  fillEdgesInPlace(px, width, height, (r, g, b) => r <= bt && g <= bt && b <= bt);
  removeDetachedFragmentsInPlace(px, width, height);
  return { png: await encodePng(px, width, height), blackThreshold: bt, whiteThreshold: detected.whiteThreshold };
}

/**
 * Removes near-white border pixels connected to the image edge, then erases
 * any detached opaque fragments not connected to the main body.
 * Returns a PNG with an alpha channel.
 *
 * @param threshold Explicit min R/G/B for "white". Omit to auto-detect.
 */
export async function removeWhiteBorders(
  input: Buffer | ArrayBuffer,
  threshold?: number
): Promise<{ png: Buffer; blackThreshold: number; whiteThreshold: number }> {
  const { px, width, height } = await decodeRgba(input);
  const detected = detectThresholdsFromRgba(px, width, height);
  const wt = threshold ?? detected.whiteThreshold;
  fillEdgesInPlace(px, width, height, (r, g, b) => r >= wt && g >= wt && b >= wt);
  removeDetachedFragmentsInPlace(px, width, height);
  return { png: await encodePng(px, width, height), blackThreshold: detected.blackThreshold, whiteThreshold: wt };
}

/**
 * Removes both near-black and near-white border pixels in a single pass,
 * then erases detached opaque fragments not connected to the main body.
 * Omit either threshold to auto-detect from edge samples.
 * Returns a PNG with an alpha channel.
 */
export async function removeBorders(
  input: Buffer | ArrayBuffer,
  options: { blackThreshold?: number; whiteThreshold?: number } = {}
): Promise<{ png: Buffer; blackThreshold: number; whiteThreshold: number }> {
  const { px, width, height } = await decodeRgba(input);
  const detected = detectThresholdsFromRgba(px, width, height);
  const bt = options.blackThreshold ?? detected.blackThreshold;
  const wt = options.whiteThreshold ?? detected.whiteThreshold;
  fillEdgesInPlace(
    px, width, height,
    (r, g, b) =>
      (r <= bt && g <= bt && b <= bt) ||
      (r >= wt && g >= wt && b >= wt)
  );
  removeDetachedFragmentsInPlace(px, width, height);
  return { png: await encodePng(px, width, height), blackThreshold: bt, whiteThreshold: wt };
}
