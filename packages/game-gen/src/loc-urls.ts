/**
 * Pure URL resolution helpers for LOC / Chronicling America resources.
 * All functions are stateless and side-effect free.
 */
import type { LocItem } from "./types.js";

function collectResourceCandidates(resourceData: any): string[] {
  const candidates: string[] = [];

  const push = (value: unknown) => {
    if (typeof value === "string") candidates.push(value);
  };

  const collectFrom = (obj: unknown) => {
    if (!obj || typeof obj !== "object") return;
    const r = obj as Record<string, unknown>;
    push(r.url);
    push(r.file);
    push(r.image);
    push(r.image_url);
    push(r.iiif_url);
  };

  for (const source of [resourceData.resources, resourceData.item?.resources]) {
    if (!Array.isArray(source)) continue;
    for (const res of source) {
      if (typeof res === "string") push(res);
      else collectFrom(res);
    }
  }

  if (Array.isArray(resourceData.page)) {
    for (const page of resourceData.page) {
      push(page?.url);
      collectFrom(page);
    }
  }

  return candidates;
}

function findPdfUrl(resourceData: any): string | null {
  if (!resourceData || typeof resourceData !== "object") return null;
  if (typeof resourceData.pdf === "string") return resourceData.pdf;
  const candidates = collectResourceCandidates(resourceData);
  return candidates.find((url) => url.includes(".pdf")) ?? null;
}

// Converts a raw IIIF service URL to a JPEG image request suitable for OCR.
// Strips any existing image parameters and applies a fixed 25% scale.
function iiifToJpeg(url: string): string {
  const base = url.replace(/\/full\/[^/]+\/[^/]+\/[^.]+\.[a-z0-9]+$/i, "");
  return `${base}/full/pct:25/0/default.jpg`;
}

function findImageUrl(resourceData: any, pdfUrl: string | null): string | null {
  if (!resourceData || typeof resourceData !== "object") return null;
  const candidates = collectResourceCandidates(resourceData);

  // 1. Direct JPEG — best for Gemini OCR, no transformation needed
  const jpeg = candidates.find((url) => /(\.jpg|\.jpeg)(\?|#|$)/i.test(url));
  if (jpeg) return jpeg;

  // 2. IIIF service URL — form a proper JPEG image request at 25% scale
  const iiif = candidates.find((url) => url.includes("/iiif/"));
  if (iiif) return iiifToJpeg(iiif);

  // 3. JPEG 2000 (.jp2) from Chronicling America — a .jpg sibling always exists
  const jp2 = candidates.find((url) => /\.jp2(\?|#|$)/i.test(url));
  if (jp2) return jp2.replace(/\.jp2(\?|#|$)/i, ".jpg$1");

  // 4. PDF-adjacent JPEG (last-resort derivation from the PDF URL)
  if (typeof pdfUrl === "string" && pdfUrl.includes(".pdf")) {
    return pdfUrl.replace(/\.pdf(\?|#|$)/i, ".jpg$1");
  }

  // 5. Any other image format
  return (
    candidates.find((url) =>
      /(\.png|\.gif|\.webp|\.tif|\.tiff)(\?|#|$)/i.test(url)
    ) ?? null
  );
}

function resolveResourceUrl(item: LocItem): string | null {
  if (typeof item.id === "string" && item.id.includes("/resource/")) return item.id;
  if (typeof item.url === "string" && item.url.includes("/resource/")) return item.url;
  if (Array.isArray(item.resources)) {
    for (const r of item.resources) {
      if (typeof r === "string" && r.includes("/resource/")) return r;
      if (r && typeof r.url === "string" && r.url.includes("/resource/")) return r.url;
    }
  }
  return null;
}

export { findPdfUrl, iiifToJpeg, findImageUrl, resolveResourceUrl };
