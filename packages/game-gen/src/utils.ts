import { MAX_SNIPPET_WORDS, MIN_SNIPPET_WORDS } from "./config.js";
import type { Snippet } from "./types.js";

function words(text: string) {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

function excerptFromClipping(raw: string) {
  const cleaned = String(raw || "")
    .replace(/\s+/g, " ")
    .trim();
  const w = words(cleaned);
  if (w.length < 20) return null;
  if (w.length <= MAX_SNIPPET_WORDS) return w.join(" ");
  return w.slice(0, MAX_SNIPPET_WORDS).join(" ");
}

function normalizeTitle(value: unknown) {
  const raw = Array.isArray(value) ? value.join(" ") : value || "";
  return String(raw).replace(/\s+/g, " ").trim();
}

function decodeEntities(text: string) {
  return text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function isLameTitle(title: string) {
  const t = title.toUpperCase();
  return t.startsWith("IMAGE ") || t.startsWith("IMG ") || t.includes("IMAGE OF ");
}

function deriveHeadlineFromText(text: string) {
  const decoded = decodeEntities(text || "");
  const normalized = decoded.replace(/\s+/g, " ").trim();

  const capsCandidates = normalized.match(/\b[A-Z][A-Z\s'’\-]{10,90}\b/g) || [];
  for (const candidate of capsCandidates) {
    const words = candidate
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter((w) => w.length > 1 || w === "A" || w === "I");
    if (words.length >= 4 && words.length <= 12) {
      return words.slice(0, 10).join(" ").toUpperCase();
    }
  }

  const sentences = normalized.split(/[.!?]/);
  for (const sentence of sentences) {
    const words = sentence
      .replace(/[^A-Za-z'’\-]+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean)
      .filter((w) => w.length > 1 || w === "A" || w === "I");
    if (words.length >= 4) {
      return words.slice(0, 10).join(" ").toUpperCase();
    }
  }

  return normalized.split(" ").slice(0, 8).join(" ").toUpperCase();
}

function stripSchemaExtras(node: unknown): unknown {
  if (!node || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(stripSchemaExtras);
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "propertyOrdering") continue;
    cleaned[key] = stripSchemaExtras(value);
  }
  return cleaned;
}

function heuristicRejectSnippet(snippet: Snippet) {
  const text = decodeEntities(String(snippet.text || ""));
  const wordsList = words(text);
  if (wordsList.length < MIN_SNIPPET_WORDS) return "too-short";

  const alphaChars = text.replace(/[^A-Za-z]/g, "").length;
  const nonSpaceChars = text.replace(/\s/g, "").length;
  const alphaRatio = nonSpaceChars ? alphaChars / nonSpaceChars : 0;
  if (alphaRatio < 0.6) return "low-alpha";

  const weirdCharCount = (text.match(/[^\x09\x0A\x0D\x20-\x7E]/g) || []).length;
  if (weirdCharCount > 4) return "weird-chars";

  const digitRatio = (text.match(/\d/g) || []).length / Math.max(1, text.length);
  if (digitRatio > 0.08) return "too-many-digits";

  if (/([A-Z]{5,}\s*){4,}/.test(text)) return "caps-garble";
  if (/([a-z]{2,}\s*){30,}/.test(text) && !/[.!?]/.test(text)) return "no-sentences";

  const headline = String(snippet.headline || "");
  if (headline.length < 8 || headline.length > 90) return "headline-length";

  return null;
}

function ensureFoJson(url?: string | null) {
  if (!url) return null;
  const normalized = url.replace(/^http:/, "https:");
  if (normalized.includes("fo=json")) return normalized;
  return normalized + (normalized.includes("?") ? "&" : "?") + "fo=json";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logStep(message: string) {
  const stamp = new Date().toISOString();
  console.log(`[${stamp}] ${message}`);
}

function isBlobNotFoundError(err: unknown) {
  const name = err && typeof err === "object" ? String((err as { name?: string }).name || "") : "";
  const message = err instanceof Error ? err.message : String(err || "");
  return /BlobNotFoundError/i.test(name) || /not found/i.test(message) || /does not exist/i.test(message);
}

function estimateCostUsd(inputTokens: number, outputTokens: number, priceIn: number, priceOut: number) {
  const inputCost = (inputTokens / 1_000_000) * priceIn;
  const outputCost = (outputTokens / 1_000_000) * priceOut;
  return inputCost + outputCost;
}

export {
  words,
  excerptFromClipping,
  normalizeTitle,
  decodeEntities,
  isLameTitle,
  deriveHeadlineFromText,
  stripSchemaExtras,
  heuristicRejectSnippet,
  ensureFoJson,
  sleep,
  logStep,
  isBlobNotFoundError,
  estimateCostUsd,
};
