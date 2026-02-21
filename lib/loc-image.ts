/**
 * Upgrades a LOC IIIF image URL to a higher quality size.
 *
 * IIIF size segment examples:
 *   pct:6.25   → ~250px wide for a typical LOC newspaper scan
 *   800,        → 800px wide, aspect ratio preserved
 *   full        → full resolution (can be 4000+ px)
 *
 * Replaces whatever size segment is present with `{width},`
 * (IIIF "width only" — server preserves aspect ratio).
 * Non-IIIF URLs are returned unchanged.
 */
export function upgradeLocImageUrl(url: string, width = 800): string {
  // IIIF path structure: .../{prefix}/full/{size}/{rotation}/default.{ext}
  return url.replace(/\/full\/[^/]+\/(\d+\/default\.)/, `/full/${width},/$1`);
}
