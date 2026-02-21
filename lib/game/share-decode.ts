export function decodeShareParam(s: string): { layout: number; score: number; total: number } | null {
  try {
    let b64 = s;
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    const parts = atob(b64).split(":");
    if (parts.length !== 3) return null;
    const layout = parseInt(parts[0], 10);
    const score = parseInt(parts[1], 10);
    const total = parseInt(parts[2], 10);
    if ([0, 1, 2].includes(layout) && !isNaN(score) && !isNaN(total) && total > 0 && score >= 0 && score <= total) {
      return { layout, score, total };
    }
  } catch {}
  return null;
}
