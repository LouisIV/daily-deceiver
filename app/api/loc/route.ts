import { NextResponse } from "next/server";

export const runtime = "nodejs";

type LocSnippet = {
  headline: string;
  text: string;
  source: string;
};

type RequestBody = {
  count?: number;
  queries?: string[];
};

const DEFAULT_QUERIES = [
  "lost horse reward 1890",
  "runaway wagon 1895",
  "county fair 1900",
  "fire destroyed building 1888",
  "railroad accident 1892",
  "church social ladies 1898",
  "peculiar circumstance 1885",
  "harvest wheat 1903",
  "town council meeting 1896",
  "marriage ceremony 1901",
];

const MIN_WORDS = 40;
const MAX_WORDS = 120;

function cleanQuery(query: string): string {
  return query
    .replace(/site:chroniclingamerica\.loc\.gov/gi, "")
    .trim();
}

function toWords(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function pickExcerpt(raw: string): string | null {
  const text = stripHtml(raw)
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[|_~`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = toWords(text);
  if (words.length < MIN_WORDS) return null;

  if (words.length <= MAX_WORDS) return words.join(" ");

  const sentenceParts = text.split(/(?<=[.!?])\s+/);
  for (const sentence of sentenceParts) {
    const sentenceWords = toWords(sentence);
    if (sentenceWords.length >= MIN_WORDS && sentenceWords.length <= MAX_WORDS) {
      return sentenceWords.join(" ");
    }
  }

  return words.slice(0, MAX_WORDS).join(" ");
}

function headlineFrom(title: string | null, text: string): string {
  const raw = (title || "").trim();
  if (raw) {
    const candidate = raw
      .replace(/\s+/g, " ")
      .split(" ")
      .slice(0, 8)
      .join(" ")
      .toUpperCase();
    if (candidate.length >= 8) return candidate;
  }

  return text
    .split(/\s+/)
    .slice(0, 6)
    .join(" ")
    .toUpperCase();
}

function safeJsonParse<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "newspaper-game/1.0" },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = (await res.json()) as unknown;
      return extractTextish(json).join(" ");
    }

    return await res.text();
  } catch {
    return null;
  }
}

function collectObjects(value: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    for (const item of value) collectObjects(item, out);
    return out;
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    out.push(obj);
    for (const v of Object.values(obj)) collectObjects(v, out);
  }

  return out;
}

function extractTextish(value: unknown): string[] {
  const matches: string[] = [];
  const objs = collectObjects(value);
  const textKey = /(ocr|text|snippet|description|abstract|transcript|caption|notes?)/i;

  for (const obj of objs) {
    for (const [k, v] of Object.entries(obj)) {
      if (!textKey.test(k)) continue;

      if (typeof v === "string") {
        matches.push(v);
      } else if (Array.isArray(v)) {
        for (const part of v) {
          if (typeof part === "string") matches.push(part);
        }
      }
    }
  }

  return matches;
}

function extractUrls(value: unknown): string[] {
  const urls: string[] = [];
  const objs = collectObjects(value);

  for (const obj of objs) {
    for (const v of Object.values(obj)) {
      if (typeof v === "string" && /^https?:\/\//i.test(v)) {
        urls.push(v);
      } else if (Array.isArray(v)) {
        for (const part of v) {
          if (typeof part === "string" && /^https?:\/\//i.test(part)) {
            urls.push(part);
          }
        }
      }
    }
  }

  return Array.from(new Set(urls));
}

function extractTitle(obj: Record<string, unknown>): string | null {
  const keys = ["title", "item", "headline", "label"];
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function extractSource(obj: Record<string, unknown>): string {
  const title = extractTitle(obj);
  const date =
    (typeof obj.date === "string" && obj.date) ||
    (typeof obj.created === "string" && obj.created) ||
    (typeof obj.timestamp === "string" && obj.timestamp) ||
    "";

  if (title && date) return `${title}, ${date}`;
  if (title) return title;
  if (date) return `Chronicling America, ${date}`;
  return "Chronicling America / Library of Congress";
}

async function searchEndpoint(url: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "newspaper-game/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return [];

    const text = await res.text();
    const json = safeJsonParse<unknown>(text);
    if (!json) return [];

    const objs = collectObjects(json);
    return objs.filter((obj) => {
      const hasTitle = typeof obj.title === "string";
      const hasUrl = Object.values(obj).some(
        (v) => typeof v === "string" && /^https?:\/\//i.test(v)
      );
      const hasText = extractTextish(obj).length > 0;
      return hasTitle || hasUrl || hasText;
    });
  } catch {
    return [];
  }
}

async function snippetsForQuery(query: string): Promise<LocSnippet[]> {
  const q = encodeURIComponent(cleanQuery(query));
  const endpoints = [
    `https://www.loc.gov/collections/chronicling-america/?fo=json&at=results&q=${q}&c=20`,
    `https://chroniclingamerica.loc.gov/search/pages/results/?andtext=${q}&dateFilterType=yearRange&date1=1875&date2=1920&format=json`,
  ];

  const snippets: LocSnippet[] = [];

  for (const endpoint of endpoints) {
    const results = await searchEndpoint(endpoint);

    for (const obj of results) {
      if (snippets.length >= 6) break;

      let textCandidates = extractTextish(obj);
      if (textCandidates.join(" ").length < 240) {
        const urls = extractUrls(obj)
          .filter((u) => /loc\.gov|chroniclingamerica\.loc\.gov/i.test(u))
          .slice(0, 5);

        for (const url of urls) {
          const variants = [
            /\/ocr\.txt$/i.test(url) ? url : `${url.replace(/\/$/, "")}/ocr.txt`,
            `${url}${url.includes("?") ? "&" : "?"}fo=json`,
            url,
          ];

          for (const candidate of variants) {
            const pulled = await fetchText(candidate);
            if (pulled) textCandidates.push(pulled);
            if (textCandidates.join(" ").length > 900) break;
          }
          if (textCandidates.join(" ").length > 900) break;
        }
      }

      const excerpt = pickExcerpt(textCandidates.join(" "));
      if (!excerpt) continue;

      snippets.push({
        headline: headlineFrom(extractTitle(obj), excerpt),
        text: excerpt,
        source: extractSource(obj),
      });
    }

    if (snippets.length >= 3) break;
  }

  return snippets;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = (await req.json()) as RequestBody;
    const count = Math.max(1, Math.min(10, body.count ?? 5));
    const inputQueries =
      Array.isArray(body.queries) && body.queries.length > 0
        ? body.queries
        : DEFAULT_QUERIES;

    const snippets: LocSnippet[] = [];
    const seen = new Set<string>();

    for (const query of inputQueries) {
      if (snippets.length >= count) break;
      const found = await snippetsForQuery(query);

      for (const item of found) {
        if (snippets.length >= count) break;
        const key = `${item.headline}::${item.text.slice(0, 80)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        snippets.push(item);
      }
    }

    return NextResponse.json({ snippets });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
