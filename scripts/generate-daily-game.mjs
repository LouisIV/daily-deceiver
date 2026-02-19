import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

/* ─── Config ─────────────────────────────────────────────────────────────── */
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_MODE = process.argv.includes("--local") || !BLOB_READ_WRITE_TOKEN;

if (!ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

if (LOCAL_MODE && !BLOB_READ_WRITE_TOKEN) {
  console.log("No BLOB_READ_WRITE_TOKEN — running in local mode.");
}

/* ─── Chronicling America ─────────────────────────────────────────────────── */
const SEARCH_QUERIES = [
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

const MIN_SNIPPET_WORDS = 40;
const MAX_SNIPPET_WORDS = 120;

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

function headlineFromItem(item, text) {
  const title = (item.title || "").replace(/\s+/g, " ").trim();
  if (title) return title.split(" ").slice(0, 8).join(" ").toUpperCase();
  return text.split(" ").slice(0, 6).join(" ").toUpperCase();
}

async function fetchRealSnippets(count = 5) {
  const snippets = [];
  const seen = new Set();
  const queries = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);

  for (const query of queries) {
    if (snippets.length >= count) break;
    console.log(`  Searching: "${query}"…`);

    const searchUrl =
      "https://chroniclingamerica.loc.gov/search/pages/results/?" +
      new URLSearchParams({
        andtext: query,
        dateFilterType: "yearRange",
        date1: "1875",
        date2: "1920",
        rows: "20",
        format: "json",
      }).toString();

    let items = [];
    try {
      const res = await fetch(searchUrl);
      if (!res.ok) continue;
      const data = await res.json();
      items = Array.isArray(data.items) ? data.items : [];
    } catch {
      continue;
    }

    for (const item of items) {
      if (snippets.length >= count) break;
      const ocrUrl =
        item.ocr_eng ||
        item.ocr ||
        (item.url ? `${item.url.replace(/\/$/, "")}/ocr.txt` : null);
      if (!ocrUrl) continue;

      try {
        const textRes = await fetch(ocrUrl);
        if (!textRes.ok) continue;
        const raw = await textRes.text();
        const excerpt = excerptFromOcr(raw);
        if (!excerpt) continue;

        const dedupeKey = `${item.title || ""}::${excerpt.slice(0, 90)}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        snippets.push({
          headline: headlineFromItem(item, excerpt),
          text: excerpt,
          source:
            [item.title, item.date].filter(Boolean).join(", ") ||
            "Chronicling America / Library of Congress",
          real: true,
        });
      } catch {
        continue;
      }
    }
  }

  return snippets;
}

/* ─── Anthropic (direct API, no SDK needed) ──────────────────────────────── */
async function generateFakeSnippets(count = 5) {
  console.log("  Generating fake snippets via Claude…");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1400,
      system: `Generate fake 19th-century American small-town newspaper snippets for a trivia game.
Each needs a short punchy headline (4-8 words ALL CAPS) and body text (40-120 words).
Sound authentically period-appropriate (1875-1920), plausible but subtly amusing.
Vary types: notices, news items, social columns, want ads, editorial comments.
Return ONLY raw JSON array, no markdown:
[{"headline":"HEADLINE HERE","text":"body here"}, ...]`,
      messages: [
        {
          role: "user",
          content: `Generate ${count} fake 19th-century American newspaper snippets as a JSON array of objects with headline and text fields.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) throw new Error("No JSON array in Claude response");

  const parsed = JSON.parse(m[0]);
  return parsed.slice(0, count).map((o) => ({
    headline: o.headline || "NOTICE TO THE PUBLIC",
    text: String(o.text),
    real: false,
  }));
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
async function main() {
  console.log(`Generating daily game (${LOCAL_MODE ? "local" : "blob"} mode)…`);

  console.log("Fetching real snippets from Chronicling America…");
  const reals = await fetchRealSnippets(5);
  console.log(`  Got ${reals.length} real snippets`);

  const fakeCount = Math.max(5, 10 - reals.length);
  console.log(`Generating ${fakeCount} fake snippets…`);
  const fakes = await generateFakeSnippets(fakeCount);
  console.log(`  Got ${fakes.length} fake snippets`);

  const snippets = [...reals, ...fakes];
  if (snippets.length < 5) {
    throw new Error(`Not enough snippets: got ${snippets.length}`);
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
      contentType: "application/json",
      cacheControlMaxAge: 3600,
      token: BLOB_READ_WRITE_TOKEN,
    });
    console.log(`Done! Blob URL: ${blob.url}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
