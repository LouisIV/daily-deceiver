import type { Snippet } from "./types";

const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp|tif|tiff)(\?|#|$)/i;
const PDF_EXT_RE = /\.pdf(\?|#|$)/i;

function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }
  return trimmed;
}

function isLocUrl(url: string): boolean {
  return /(^|\.)loc\.gov$/i.test(new URL(url).hostname);
}

function deriveImageFromPdf(url: string): string[] {
  if (!PDF_EXT_RE.test(url)) return [];
  return [
    url.replace(/\.pdf(\?|#|$)/i, ".jpg$1"),
    url.replace(/\.pdf(\?|#|$)/i, ".jpeg$1"),
    url.replace(/\.pdf(\?|#|$)/i, ".png$1"),
  ];
}

export function getLocSourceLink(
  snippet: Snippet
): { href: string; label: string } | null {
  if (!snippet.real) return null;

  const pageUrl = cleanUrl(snippet.pageUrl);
  const pdfUrl = cleanUrl(snippet.pdfUrl);
  const imageUrl = cleanUrl(snippet.imageUrl);
  const genericUrl = cleanUrl(snippet.url);

  const all = [pageUrl, pdfUrl, imageUrl, genericUrl].filter(
    (url): url is string => Boolean(url)
  );
  const locPage = all.find(
    (url) => isLocUrl(url) && !PDF_EXT_RE.test(url) && !IMAGE_EXT_RE.test(url)
  );
  const locPdf = all.find((url) => isLocUrl(url) && PDF_EXT_RE.test(url));
  const locImage = all.find(
    (url) => isLocUrl(url) && (IMAGE_EXT_RE.test(url) || url.includes("/iiif/"))
  );
  const fallback = all.find((url) => isLocUrl(url)) ?? all[0];

  const href = locPage ?? locPdf ?? locImage ?? fallback;
  if (!href) return null;

  const label = locPdf
    ? "View PDF at Library of Congress"
    : locImage
    ? "View image at Library of Congress"
    : "View clipping at Library of Congress";

  return { href, label };
}

export function getLocSourceMedia(snippet: Snippet): {
  pageHref: string;
  mediaHref: string | null;
  mediaType: "image" | null;
} | null {
  if (!snippet.real) return null;

  const pageUrl = cleanUrl(snippet.pageUrl);
  const pdfUrl = cleanUrl(snippet.pdfUrl);
  const imageUrl = cleanUrl(snippet.imageUrl);
  const genericUrl = cleanUrl(snippet.url);

  const all = [pageUrl, pdfUrl, imageUrl, genericUrl].filter(
    (url): url is string => Boolean(url)
  );
  const locPage = all.find(
    (url) => isLocUrl(url) && !PDF_EXT_RE.test(url) && !IMAGE_EXT_RE.test(url)
  );
  const locPdf = all.find((url) => isLocUrl(url) && PDF_EXT_RE.test(url));
  const locImageFromFields = all.find(
    (url) => isLocUrl(url) && (IMAGE_EXT_RE.test(url) || url.includes("/iiif/"))
  );
  const derivedImageCandidates = locPdf ? deriveImageFromPdf(locPdf) : [];
  const locImage = locImageFromFields || derivedImageCandidates.find(isLocUrl) || null;
  const fallback = all.find((url) => isLocUrl(url)) ?? all[0];

  const pageHref = locPage ?? fallback;
  if (!pageHref) return null;

  if (locImage) {
    return { pageHref, mediaHref: locImage, mediaType: "image" };
  }

  return { pageHref, mediaHref: null, mediaType: null };
}
