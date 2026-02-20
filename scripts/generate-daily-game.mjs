import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

/* ─── Config ─────────────────────────────────────────────────────────────── */
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL_GEN =
  process.env.ANTHROPIC_MODEL_GEN || "claude-haiku-4-5";
const ANTHROPIC_MODEL_SCORE =
  process.env.ANTHROPIC_MODEL_SCORE || "claude-sonnet-4-6";
const PRICE_PER_MTOK_IN_GEN = 1;
const PRICE_PER_MTOK_OUT_GEN = 5;
const PRICE_PER_MTOK_IN_SCORE = 3;
const PRICE_PER_MTOK_OUT_SCORE = 15;
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
const AI_GATEWAY_BASE_URL = process.env.AI_GATEWAY_BASE_URL || "https://ai-gateway.vercel.sh/v1";
const GEMINI_OCR_MODEL = process.env.GEMINI_OCR_MODEL || "google/gemini-2.0-flash-lite";
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_MODE = process.argv.includes("--local") || !BLOB_READ_WRITE_TOKEN;
const SKIP_LOC = process.argv.includes("--skip-loc");
const FORCE_GENERATE = process.argv.includes("--force");
const PLAY_FLAG_PATH = "play-flag.txt";

if (!ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

if (!AI_GATEWAY_API_KEY && !SKIP_LOC) {
  console.error("Missing AI_GATEWAY_API_KEY (or VERCEL_OIDC_TOKEN) for OCR");
  process.exit(1);
}

if (LOCAL_MODE && !BLOB_READ_WRITE_TOKEN) {
  console.log("No BLOB_READ_WRITE_TOKEN — running in local mode.");
}

/* ─── Chronicling America (loc.gov API) ───────────────────────────────────── */
const TOPIC_TERMS = [
  "train wreck",
  "railroad accident",
  "bank robbery",
  "stagecoach",
  "runaway horse",
  "town council",
  "schoolhouse",
  "church social",
  "temperance",
  "suffrage",
  "lynching",
  "murder",
  "arson",
  "fire",
  "flood",
  "tornado",
  "blizzard",
  "drought",
  "mining",
  "strike",
  "union",
  "election",
  "mayor",
  "telegraph",
  "telephone",
  "electric light",
  "epidemic",
  "smallpox",
  "scarlet fever",
  "cholera",
  "county fair",
  "circus",
  "parade",
  "saloon",
  "whiskey",
  "temperance pledge",
  "land dispute",
  "lost child",
  "elopement",
  "trial",
  "verdict",
  "accident",
  "explosion",
  "boiler",
  "steamboat",
  "ferry",
  "immigration",
  "homestead",
  "claim jump",
  "depot",
  "livery",
  "grange",
  "harvest",
  "wheat",
  "corn",
  "coal",
  "silver",
  "gold",
  "mail coach",
  "outlaw",
  "posse",
  "reward",
  "missing",
  "stolen",
  "jail break",
  "riot",
  "snowstorm",
  "hailstorm",
  "barn fire",
  "hotel fire",
  "school fire",
  "bridge collapse",
  "river rise",
  "earthquake",
  "lightning strike",
  "rail",
  "telegraph line",
  "cattle drive",
  "rustler",
  "stage line",
  "opera house",
  "lecture",
  "invention",
  "patent",
  "county seat",
  "court house",
  "grand jury",
  "indictment",
  "pension",
  "veteran",
  "Spanish-American War",
  "monument",
];

const EXTRA_TERMS = [
  "near",
  "in",
  "at",
  "outside",
  "yesterday",
  "last night",
  "this week",
  "last Saturday",
];

const MIN_SNIPPET_WORDS = 40;
const MAX_SNIPPET_WORDS = 120;
const OVERFETCH_REAL = 30;
const OVERFETCH_FAKE = 30;
const MIN_SCORE = 6;
const TARGET_REAL = 5;
const TARGET_TOTAL = 10;
const LOC_BASE = "https://www.loc.gov/collections/chronicling-america/";
const LOC_START_DATE = "1875-01-01";
const LOC_END_DATE = "1920-12-31";
const LOC_RESULTS_PER_QUERY = 25;
const LOC_REQUEST_DELAY_MS = 350;

function words(text) {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

function excerptFromOcr(raw) {
  const cleaned = raw
    .replace(/\[[^\]]*]/g, " ")
    .replace(/[|_~`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const w = words(cleaned);
  if (w.length < MIN_SNIPPET_WORDS) return null;
  if (w.length <= MAX_SNIPPET_WORDS) return w.join(" ");
  return w.slice(0, MAX_SNIPPET_WORDS).join(" ");
}

function excerptFromClipping(raw) {
  const cleaned = String(raw || "")
    .replace(/\s+/g, " ")
    .trim();
  const w = words(cleaned);
  if (w.length < 20) return null;
  if (w.length <= MAX_SNIPPET_WORDS) return w.join(" ");
  return w.slice(0, MAX_SNIPPET_WORDS).join(" ");
}

function normalizeTitle(value) {
  const raw = Array.isArray(value) ? value.join(" ") : value || "";
  return String(raw).replace(/\s+/g, " ").trim();
}

function headlineFromItem(item, text) {
  const title = normalizeTitle(item.title || item.heading || item.newspaper_title);
  if (title) return title.split(" ").slice(0, 8).join(" ").toUpperCase();
  return text.split(" ").slice(0, 6).join(" ").toUpperCase();
}

function decodeEntities(text) {
  return text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function isLameTitle(title) {
  const t = title.toUpperCase();
  return t.startsWith("IMAGE ") || t.startsWith("IMG ") || t.includes("IMAGE OF ");
}

function deriveHeadlineFromText(text) {
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

function stripSchemaExtras(node) {
  if (!node || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(stripSchemaExtras);
  const cleaned = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "propertyOrdering") continue;
    cleaned[key] = stripSchemaExtras(value);
  }
  return cleaned;
}

function loadOcrPrompt() {
  return {
    prompt:
      "Extract the headlines and body of each story. Only return interesting or unique stories. Return 3-5 clippings. The body should be two to three lines from the main body of the article. If there is a sub-heading include it (usually capitalized). Return only text that appears in the document",
    schema: stripSchemaExtras({
      type: "object",
      properties: {
        clippings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              headline: { type: "string" },
              body: { type: "string" },
              "sub-heading": { type: "string" },
            },
            required: ["headline", "body"],
          },
        },
      },
    }),
  };
}

async function ocrWithGemini(imageUrl, promptConfig) {
  const res = await fetch(`${AI_GATEWAY_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
    },
    body: JSON.stringify({
      model: GEMINI_OCR_MODEL,
      max_tokens: 1500,
      messages: [
        { role: "system", content: promptConfig.prompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract text from this newspaper page image." },
            { type: "image_url", image_url: { url: imageUrl, detail: "auto" } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "clippings",
          schema: promptConfig.schema,
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`AI Gateway OCR error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const usage = data.usage || {};
  if (usage.prompt_tokens || usage.completion_tokens) {
    logStep(
      `  Gemini OCR usage: in=${usage.prompt_tokens || 0} out=${usage.completion_tokens || 0}`
    );
  }

  const text = data.choices?.[0]?.message?.content || "";
  const parsed = JSON.parse(text);
  const clippings = Array.isArray(parsed?.clippings) ? parsed.clippings : [];
  return clippings;
}

function heuristicRejectSnippet(snippet) {
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
  if (/([a-z]{2,}\s*){30,}/.test(text) && !/[.!?]/.test(text))
    return "no-sentences";

  const headline = String(snippet.headline || "");
  if (headline.length < 8 || headline.length > 90) return "headline-length";

  return null;
}

function ensureFoJson(url) {
  if (!url) return null;
  const normalized = url.replace(/^http:/, "https:");
  if (normalized.includes("fo=json")) return normalized;
  return normalized + (normalized.includes("?") ? "&" : "?") + "fo=json";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logStep(message) {
  const stamp = new Date().toISOString();
  console.log(`[${stamp}] ${message}`);
}

function isBlobNotFoundError(err) {
  const name = err && typeof err === "object" ? String(err.name || "") : "";
  const message = err instanceof Error ? err.message : String(err || "");
  return (
    /BlobNotFoundError/i.test(name) ||
    /not found/i.test(message) ||
    /does not exist/i.test(message)
  );
}

function estimateCostUsd(inputTokens, outputTokens, priceIn, priceOut) {
  const inputCost = (inputTokens / 1_000_000) * priceIn;
  const outputCost = (outputTokens / 1_000_000) * priceOut;
  return inputCost + outputCost;
}

async function fetchJsonWithRetry(url, retries = 2) {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, {
      headers: { "User-Agent": "newspaper-game/1.0 (snippet-fetcher)" },
    });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      attempt += 1;
      await sleep(800 * attempt);
      continue;
    }
    throw new Error(`LOC API error ${res.status}: ${await res.text()}`);
  }
}

async function fetchTextWithRetry(url, retries = 2) {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, {
      headers: { "User-Agent": "newspaper-game/1.0 (snippet-fetcher)" },
    });
    if (res.ok) return res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      attempt += 1;
      await sleep(800 * attempt);
      continue;
    }
    throw new Error(`LOC text error ${res.status}: ${await res.text()}`);
  }
}

function extractFullText(data) {
  if (!data || typeof data !== "object") return null;
  if (typeof data.full_text === "string") return data.full_text;
  if (typeof data.resource?.full_text === "string") return data.resource.full_text;
  if (typeof data.item?.full_text === "string") return data.item.full_text;
  const segmentText = data.segments?.find?.((s) => typeof s?.full_text === "string")?.full_text;
  if (segmentText) return segmentText;
  const pageText = data.page?.find?.((p) => typeof p?.full_text === "string")?.full_text;
  if (pageText) return pageText;
  return null;
}

function extractTextFromAltoXml(xml) {
  const matches = [...xml.matchAll(/CONTENT="([^"]+)"/g)];
  if (!matches.length) return null;
  return matches.map((m) => m[1]).join(" ");
}

function findPdfUrl(resourceData) {
  if (!resourceData || typeof resourceData !== "object") return null;
  if (typeof resourceData.pdf === "string") return resourceData.pdf;
  const candidates = [];
  if (Array.isArray(resourceData.resources)) {
    for (const res of resourceData.resources) {
      if (typeof res === "string") candidates.push(res);
      else if (res && typeof res.url === "string") candidates.push(res.url);
      else if (res && typeof res.file === "string") candidates.push(res.file);
    }
  }
  if (Array.isArray(resourceData.item?.resources)) {
    for (const res of resourceData.item.resources) {
      if (typeof res === "string") candidates.push(res);
      else if (res && typeof res.url === "string") candidates.push(res.url);
      else if (res && typeof res.file === "string") candidates.push(res.file);
    }
  }
  if (Array.isArray(resourceData.page)) {
    for (const page of resourceData.page) {
      if (page && typeof page.url === "string") candidates.push(page.url);
    }
  }
  const pdf = candidates.find((url) => typeof url === "string" && url.includes(".pdf"));
  return pdf || null;
}

function findImageUrl(resourceData, pdfUrl) {
  if (!resourceData || typeof resourceData !== "object") return null;
  const candidates = [];

  const pushCandidate = (value) => {
    if (typeof value === "string") candidates.push(value);
  };

  const collectFrom = (obj) => {
    if (!obj || typeof obj !== "object") return;
    pushCandidate(obj.url);
    pushCandidate(obj.file);
    pushCandidate(obj.image);
    pushCandidate(obj.image_url);
    pushCandidate(obj.iiif_url);
  };

  if (Array.isArray(resourceData.resources)) {
    for (const res of resourceData.resources) {
      if (typeof res === "string") pushCandidate(res);
      else collectFrom(res);
    }
  }
  if (Array.isArray(resourceData.item?.resources)) {
    for (const res of resourceData.item.resources) {
      if (typeof res === "string") pushCandidate(res);
      else collectFrom(res);
    }
  }
  if (Array.isArray(resourceData.page)) {
    for (const page of resourceData.page) {
      if (page && typeof page.url === "string") pushCandidate(page.url);
      collectFrom(page);
    }
  }

  if (typeof pdfUrl === "string" && pdfUrl.includes(".pdf")) {
    candidates.push(
      pdfUrl.replace(/\.pdf(\?|#|$)/i, ".jpg$1"),
      pdfUrl.replace(/\.pdf(\?|#|$)/i, ".jpeg$1"),
      pdfUrl.replace(/\.pdf(\?|#|$)/i, ".png$1")
    );
  }

  const image = candidates.find(
    (url) =>
      typeof url === "string" &&
      (/(\.jpg|\.jpeg|\.png|\.gif|\.webp|\.tif|\.tiff)(\?|#|$)/i.test(url) ||
        url.includes("/iiif/"))
  );
  return image || null;
}

function buildSearchQueries(target = 10) {
  const queries = new Set();
  const topics = [...TOPIC_TERMS].sort(() => Math.random() - 0.5);
  const extras = [...EXTRA_TERMS].sort(() => Math.random() - 0.5);

  for (const topic of topics) {
    if (queries.size >= target) break;
    queries.add(topic);
  }

  for (const topic of topics) {
    if (queries.size >= target) break;
    const extra = extras[queries.size % extras.length];
    queries.add(`${topic} ${extra}`);
  }

  for (let i = 0; i < topics.length - 1 && queries.size < target; i += 2) {
    const combo = `${topics[i]} ${topics[i + 1]}`;
    queries.add(combo);
  }

  return [...queries];
}

async function fetchRealSnippets(count = 5) {
  const snippets = [];
  const seen = new Set();
  const queries = buildSearchQueries(18);
  const promptConfig = loadOcrPrompt();

  for (const query of queries) {
    if (snippets.length >= count) break;
    logStep(`Searching: "${query}"…`);

    const searchUrl =
      LOC_BASE +
      "?" +
      new URLSearchParams({
        q: query,
        dates: "1875-1920",
        c: String(LOC_RESULTS_PER_QUERY),
        fo: "json",
      }).toString();

    let items = [];
    try {
      logStep("  LOC search request…");
      const data = await fetchJsonWithRetry(searchUrl);
      items = Array.isArray(data.results) ? data.results : [];
      if (!items.length && Array.isArray(data.items)) items = data.items;
      logStep(`  LOC search results: ${items.length}`);
    } catch {
      continue;
    }

    for (const item of items) {
      if (snippets.length >= count) break;
      try {
        logStep(`  Processing item ${snippets.length + 1}/${count}`);
        let resourceUrl =
          (typeof item.id === "string" && item.id.includes("/resource/") && item.id) ||
          (typeof item.url === "string" && item.url.includes("/resource/") && item.url) ||
          (Array.isArray(item.resources)
            ? item.resources.find((r) => {
                if (typeof r === "string") return r.includes("/resource/");
                if (r && typeof r.url === "string") return r.url.includes("/resource/");
                return false;
              })?.url || item.resources.find((r) => typeof r === "string" && r.includes("/resource/"))
            : null);

        if (!resourceUrl && typeof item.id === "string" && item.id.includes("/item/")) {
          const itemJsonUrl = ensureFoJson(item.id);
          if (itemJsonUrl) {
            await sleep(LOC_REQUEST_DELAY_MS);
            const itemData = await fetchJsonWithRetry(itemJsonUrl);
            if (Array.isArray(itemData?.resources)) {
              const res = itemData.resources.find((r) => typeof r?.url === "string" && r.url.includes("/resource/"));
              if (res?.url) resourceUrl = res.url;
            }
          }
        }

        const pageUrl =
          (typeof item.url === "string" && item.url.replace(/\?[^#]*$/, "")) ||
          (typeof resourceUrl === "string" && resourceUrl.replace(/\?[^#]*$/, "")) ||
          (typeof item.id === "string" && item.id.replace(/\?[^#]*$/, "")) ||
          null;

        const resourceJsonUrl = ensureFoJson(resourceUrl);
        if (!resourceJsonUrl) continue;

        await sleep(LOC_REQUEST_DELAY_MS);
        logStep("    LOC resource request…");
        const resourceData = await fetchJsonWithRetry(resourceJsonUrl);
        const pdfUrl = findPdfUrl(resourceData);
        const imageUrl = findImageUrl(resourceData, pdfUrl);
        if (!imageUrl) continue;

        const sourceTitle = normalizeTitle(item.title || item.heading);
        const sourceDate = Array.isArray(item.dates) ? item.dates.join(" ") : item.date || item.dates;

        await sleep(LOC_REQUEST_DELAY_MS);
        logStep("    Gemini OCR request via AI Gateway…");
        let clippings = [];
        try {
          clippings = await ocrWithGemini(imageUrl, promptConfig);
        } catch {
          continue;
        }

        for (const clipping of clippings) {
          if (snippets.length >= count) break;
          const body = normalizeTitle(clipping?.body || "");
          const subHeading = normalizeTitle(
            clipping?.["sub-heading"] || clipping?.subheading || clipping?.subHeading || ""
          );
          const combined = subHeading ? `${subHeading} — ${body}` : body;
          const excerpt = excerptFromClipping(combined);
          if (!excerpt) continue;

          const headlineRaw = normalizeTitle(clipping?.headline || "");
          const derivedHeadline = deriveHeadlineFromText(excerpt);
          const headline = headlineRaw && !isLameTitle(headlineRaw) ? headlineRaw : derivedHeadline;

          const dedupeKey = `${normalizeTitle(item.title || item.heading)}::${excerpt.slice(0, 90)}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);

          snippets.push({
            headline,
            text: excerpt,
            pdfUrl: pdfUrl || undefined,
            imageUrl: imageUrl || undefined,
            pageUrl: pageUrl || undefined,
            source:
              [sourceTitle, sourceDate].filter(Boolean).join(", ") ||
              "Chronicling America (loc.gov) / Library of Congress",
            real: true,
          });
          logStep(`  Added real snippet (${snippets.length}/${count})`);
        }
      } catch {
        continue;
      }
    }
  }

  return snippets;
}

/* ─── Anthropic (direct API, no SDK needed) ──────────────────────────────── */
async function generateFakeSnippets(count = 5) {
  logStep(`Generating ${count} fake snippets via Claude…`);

  const makeRequest = async (batchCount, extraInstruction) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL_GEN,
        max_tokens: 6000,
        system: `Generate fake 19th-century American small-town newspaper snippets for a trivia game.
Each needs a short punchy headline (4-8 words ALL CAPS) and body text (40-120 words).
Sound authentically period-appropriate (1875-1920), plausible but subtly amusing.
Vary types: notices, news items, social columns, want ads, editorial comments.
${extraInstruction || ""}`.trim(),
        messages: [
          {
            role: "user",
            content: `Generate ${batchCount} fake 19th-century American newspaper snippets as a JSON array of objects with headline and text fields.`,
          },
        ],
        output_config: {
          format: {
            type: "json_schema",
            schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  headline: { type: "string" },
                  text: { type: "string" },
                },
                required: ["headline", "text"],
                additionalProperties: false,
              },
            },
          },
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    }

    return res.json();
  };

  const parseJsonArray = (rawText) => {
    const text = String(rawText || "").trim();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  };

  let data = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    data = await makeRequest(
      count,
      attempt === 2 ? "If you cannot comply, return an empty JSON array [] only." : ""
    );
    const usage = data.usage || {};
    const inTok = usage.input_tokens || 0;
    const outTok = usage.output_tokens || 0;
    if (inTok || outTok) {
      const cost = estimateCostUsd(inTok, outTok, PRICE_PER_MTOK_IN_GEN, PRICE_PER_MTOK_OUT_GEN);
      logStep(`  Anthropic generate usage: in=${inTok} out=${outTok} cost=$${cost.toFixed(4)}`);
    } else {
      logStep(`  Anthropic generate usage missing: ${JSON.stringify(usage)}`);
    }

    const contentType = data.content?.[0]?.type || "text";
    const text = data.content?.[0]?.text || "";
    let parsed = null;
    try {
      parsed = parseJsonArray(text);
    } catch {
      parsed = null;
    }
    if (parsed) {
      return {
        snippets: parsed.slice(0, count).map((o) => ({
          headline: o.headline || "NOTICE TO THE PUBLIC",
          text: String(o.text),
          real: false,
        })),
        usage: { input_tokens: inTok, output_tokens: outTok },
      };
    }

    const stopReason = data.stop_reason || "unknown";
    logStep(
      `  Claude response parse failed (attempt ${attempt}, stop=${stopReason}, type=${contentType}). ` +
        `Preview: ${text.slice(0, 200)}`
    );
  }

  throw new Error("Failed to parse Claude JSON response for fake snippets.");
}

async function scoreSnippetsWithClaude(snippets, label) {
  if (!snippets.length) return { scores: [], usage: { input_tokens: 0, output_tokens: 0 } };
  logStep(`Scoring ${snippets.length} ${label} snippets via Claude…`);

  const batchSize = 20;
  const results = [];
  let totalIn = 0;
  let totalOut = 0;
  for (let i = 0; i < snippets.length; i += batchSize) {
    const batch = snippets.slice(i, i + batchSize);
    logStep(`  Scoring batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(snippets.length / batchSize)}`);
    const payload = batch.map((s, idx) => ({
      id: i + idx,
      headline: s.headline,
      text: s.text,
      real: s.real,
    }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL_SCORE,
        max_tokens: 900,
        system: `You are a strict editor. Score each snippet 1-10 for readability and authenticity.
Reject OCR garbage, broken words, excessive noise, or non-headline text.
Return ONLY JSON array like: [{"id":0,"score":7},{"id":1,"score":4}]`,
        messages: [
          {
            role: "user",
            content: `Score this batch:\n${JSON.stringify(payload)}`,
          },
        ],
        output_config: {
          format: {
            type: "json_schema",
            schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  score: { type: "number" },
                },
                required: ["id", "score"],
                additionalProperties: false,
              },
            },
          },
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic scoring error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const usage = data.usage || {};
    totalIn += usage.input_tokens || 0;
    totalOut += usage.output_tokens || 0;
    const text = data.content?.[0]?.text || "";
    let parsed = [];
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("No JSON array in Claude scoring response");
    }
    for (const item of parsed) {
      results.push(item);
    }
  }

  if (totalIn || totalOut) {
    const cost = estimateCostUsd(
      totalIn,
      totalOut,
      PRICE_PER_MTOK_IN_SCORE,
      PRICE_PER_MTOK_OUT_SCORE
    );
    logStep(
      `Anthropic scoring usage total: in=${totalIn} out=${totalOut} cost=$${cost.toFixed(4)}`
    );
  }

  return { scores: results, usage: { input_tokens: totalIn, output_tokens: totalOut } };
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
async function main() {
  logStep(`Generating daily game (${LOCAL_MODE ? "local" : "blob"} mode)…`);
  logStep(`Using Anthropic model (gen): ${ANTHROPIC_MODEL_GEN}`);
  logStep(`Using Anthropic model (score): ${ANTHROPIC_MODEL_SCORE}`);

  if (!LOCAL_MODE && !FORCE_GENERATE) {
    const { head } = await import("@vercel/blob");
    try {
      await head(PLAY_FLAG_PATH, { token: BLOB_READ_WRITE_TOKEN });
      logStep("Play flag found (no plays since last generation). Skipping generation.");
      process.exit(0);
    } catch (err) {
      if (!isBlobNotFoundError(err)) throw err;
      logStep("Play flag missing (someone played). Proceeding with generation.");
    }
  } else if (FORCE_GENERATE) {
    logStep("Force mode enabled (--force). Ignoring play flag.");
  }

  let runGenIn = 0;
  let runGenOut = 0;
  let runScoreIn = 0;
  let runScoreOut = 0;

  let realsFiltered = [];
  if (SKIP_LOC) {
    logStep("Skipping LOC fetch (--skip-loc)");
  } else {
    logStep("Fetching real snippets from Chronicling America…");
    const realsRaw = await fetchRealSnippets(OVERFETCH_REAL);
    realsFiltered = realsRaw.filter((s) => !heuristicRejectSnippet(s));
    logStep(`Got ${realsFiltered.length} real snippets after heuristic filter`);
  }

  logStep(`Generating ${OVERFETCH_FAKE} fake snippets…`);
  const fakeResult = await generateFakeSnippets(OVERFETCH_FAKE);
  runGenIn += fakeResult.usage.input_tokens || 0;
  runGenOut += fakeResult.usage.output_tokens || 0;
  const fakesFiltered = fakeResult.snippets.filter((s) => !heuristicRejectSnippet(s));
  logStep(`Got ${fakesFiltered.length} fake snippets after heuristic filter`);

  const scoreResult = await scoreSnippetsWithClaude(
    [...realsFiltered, ...fakesFiltered],
    "total"
  );
  runScoreIn += scoreResult.usage.input_tokens || 0;
  runScoreOut += scoreResult.usage.output_tokens || 0;
  const scores = scoreResult.scores;
  const scoreMap = new Map(scores.map((s) => [s.id, Number(s.score) || 0]));

  const scoredReals = realsFiltered
    .map((s, idx) => ({ ...s, score: scoreMap.get(idx) || 0 }))
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);

  const scoredFakes = fakesFiltered
    .map((s, idx) => ({
      ...s,
      score: scoreMap.get(realsFiltered.length + idx) || 0,
    }))
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);

  logStep(`Scored reals: ${scoredReals.length}, scored fakes: ${scoredFakes.length}`);
  const selectedReals = scoredReals.slice(0, TARGET_REAL);
  const selectedFakes = scoredFakes.slice(0, TARGET_TOTAL - selectedReals.length);
  logStep(`Selected reals: ${selectedReals.length}, selected fakes: ${selectedFakes.length}`);
  const snippets = [...selectedReals, ...selectedFakes];

  if (snippets.length < 5) {
    throw new Error(`Not enough quality snippets: got ${snippets.length}`);
  }

  if (runGenIn || runGenOut || runScoreIn || runScoreOut) {
    const genCost = estimateCostUsd(
      runGenIn,
      runGenOut,
      PRICE_PER_MTOK_IN_GEN,
      PRICE_PER_MTOK_OUT_GEN
    );
    const scoreCost = estimateCostUsd(
      runScoreIn,
      runScoreOut,
      PRICE_PER_MTOK_IN_SCORE,
      PRICE_PER_MTOK_OUT_SCORE
    );
    const totalCost = genCost + scoreCost;
    logStep(
      `Anthropic run total: gen_in=${runGenIn} gen_out=${runGenOut} ` +
        `score_in=${runScoreIn} score_out=${runScoreOut} cost=$${totalCost.toFixed(4)}`
    );
  }

  const payload = JSON.stringify(
    { snippets, generatedAt: new Date().toISOString(), date: new Date().toISOString().slice(0, 10) },
    null,
    2
  );

  if (LOCAL_MODE) {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const outPath = resolve(__dirname, "../public/fallback-game.json");
    writeFileSync(outPath, payload, "utf8");
    console.log(`Done! Written to ${outPath}`);
  } else {
    const { put } = await import("@vercel/blob");
    const blob = await put("daily-game.json", payload, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 3600,
      token: BLOB_READ_WRITE_TOKEN,
    });
    await put(PLAY_FLAG_PATH, "no-plays-since-last-generation", {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "text/plain; charset=utf-8",
      token: BLOB_READ_WRITE_TOKEN,
    });
    logStep("Recreated play flag after successful generation.");
    console.log(`Done! Blob URL: ${blob.url}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
