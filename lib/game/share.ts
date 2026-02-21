export type SharePaper = {
  headline: string;
  source?: string;
  imageUrl?: string;
};

/** Full payload for share/og URLs. All fields optional when encoding; defaults applied when decoding. */
export type SharePayload = {
  score: number;
  total: number;
  grade: string;
  papers: SharePaper[];
  texture?: boolean;
  textureIntensity?: number;
  textureOpacity?: number;
};

export const DEFAULT_PAYLOAD: SharePayload = {
  score: 0,
  total: 10,
  grade: "Final Verdict",
  papers: [],
  texture: true,
};

/** Normalize parsed JSON into SharePayload with defaults and clamping. Shared by decode paths. */
export function normalizeSharePayload(parsed: unknown): SharePayload {
  if (typeof parsed !== "object" || parsed === null) return { ...DEFAULT_PAYLOAD };
  const p = parsed as Record<string, unknown>;
  const papers = Array.isArray(p.papers)
    ? (p.papers as unknown[])
        .slice(0, 2)
        .filter(
          (x): x is SharePaper =>
            typeof x === "object" && x !== null && "headline" in x,
        )
    : DEFAULT_PAYLOAD.papers;
  const total =
    typeof p.total === "number" && Number.isFinite(p.total) && p.total >= 1
      ? Math.min(100, Math.max(1, p.total))
      : DEFAULT_PAYLOAD.total;
  const score =
    typeof p.score === "number" && Number.isFinite(p.score)
      ? p.score
      : DEFAULT_PAYLOAD.score;
  return {
    score: Math.max(0, Math.min(total, Math.round(score))),
    total,
    grade: typeof p.grade === "string" ? p.grade : DEFAULT_PAYLOAD.grade,
    papers,
    texture: p.texture === undefined ? true : Boolean(p.texture),
    textureIntensity:
      typeof p.textureIntensity === "number" && Number.isFinite(p.textureIntensity)
        ? Math.max(0, Math.min(1, p.textureIntensity))
        : undefined,
    textureOpacity:
      typeof p.textureOpacity === "number" && Number.isFinite(p.textureOpacity)
        ? Math.max(0, Math.min(1, p.textureOpacity))
        : undefined,
  };
}

/** Encode for use in URLs. btoa + encodeURIComponent handles unicode safely. */
export function encodePapers(papers: SharePaper[]): string {
  return btoa(encodeURIComponent(JSON.stringify(papers)));
}

/** Decode a papers URL param. atob is a global in browsers and Node.js 16+. */
export function decodePapers(encoded: string): SharePaper[] {
  if (!encoded) return [];
  try {
    const json = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[])
      .slice(0, 2)
      .filter(
        (p): p is SharePaper =>
          typeof p === "object" && p !== null && "headline" in p,
      );
  } catch {
    return [];
  }
}

/** Encode full share payload into a single hash (one URL param). Merges with defaults. */
export function encodeSharePayload(payload: Partial<SharePayload>): string {
  const merged: SharePayload = {
    ...DEFAULT_PAYLOAD,
    ...payload,
    papers: (payload.papers ?? DEFAULT_PAYLOAD.papers).slice(0, 2),
  };
  return btoa(encodeURIComponent(JSON.stringify(merged)));
}

/** Decode hash from URL into SharePayload. */
export function decodeSharePayload(hash: string): SharePayload {
  if (!hash || typeof hash !== "string") return { ...DEFAULT_PAYLOAD };
  try {
    const json = decodeURIComponent(atob(hash));
    return normalizeSharePayload(JSON.parse(json));
  } catch {
    return { ...DEFAULT_PAYLOAD };
  }
}
