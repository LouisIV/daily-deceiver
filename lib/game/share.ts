export type SharePaper = {
  headline: string;
  source?: string;
  imageUrl?: string;
};

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
