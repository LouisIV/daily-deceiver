import {
  LOC_BASE,
  LOC_REQUEST_DELAY_MS,
  LOC_RESULTS_PER_QUERY,
  TOPIC_TERMS,
  EXTRA_TERMS,
} from "./config.js";
import type { LocItem, OcrClipping, OcrPromptConfig, Snippet } from "./types.js";
import {
  ensureFoJson,
  excerptFromClipping,
  isLameTitle,
  deriveHeadlineFromText,
  normalizeTitle,
  logStep,
  sleep,    
} from "./utils.js";
import { loadOcrPrompt, ocrWithGemini } from "./ocr.js";
import { findPdfUrl, findImageUrl, resolveResourceUrl } from "./loc-urls.js";

// ---------------------------------------------------------------------------
// HTTP utility
// ---------------------------------------------------------------------------

async function fetchJsonWithRetry(url: string, retries = 2): Promise<any> {
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

// ---------------------------------------------------------------------------
// Query builder
// ---------------------------------------------------------------------------

function buildSearchQueries(target = 10): string[] {
  const queries = new Set<string>();
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
    queries.add(`${topics[i]} ${topics[i + 1]}`);
  }

  return [...queries];
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

interface LocResource {
  item: LocItem;
  pdfUrl: string | null;
  imageUrl: string;
  pageUrl: string | null;
  source: string;
}

class LocPipeline {
  private readonly promptConfig: OcrPromptConfig;
  private readonly snippets: Snippet[] = [];
  private readonly seen = new Set<string>();

  constructor(private readonly count: number) {
    this.promptConfig = loadOcrPrompt();
  }

  private get done(): boolean {
    return this.snippets.length >= this.count;
  }

  async run(): Promise<Snippet[]> {
    for (const query of buildSearchQueries(18)) {
      if (this.done) break;
      await this.processQuery(query);
    }
    return this.snippets;
  }

  // Stage 1: search LOC for a query, return matching items
  private async search(query: string): Promise<LocItem[]> {
    const url =
      LOC_BASE +
      "?" +
      new URLSearchParams({
        q: query,
        dates: "1875-1920",
        c: String(LOC_RESULTS_PER_QUERY),
        fo: "json",
      });
    try {
      logStep("  LOC search request…");
      const data = await fetchJsonWithRetry(url);
      const items: LocItem[] = Array.isArray(data.results) ? data.results : [];
      if (!items.length && Array.isArray(data.items)) return data.items;
      logStep(`  LOC search results: ${items.length}`);
      return items;
    } catch {
      return [];
    }
  }

  // Stage 2: resolve a LOC item → resource metadata (image/pdf/page URLs, source)
  private async resolveResource(item: LocItem): Promise<LocResource | null> {
    let resourceUrl = resolveResourceUrl(item);

    if (!resourceUrl && typeof item.id === "string" && item.id.includes("/item/")) {
      const itemJsonUrl = ensureFoJson(item.id);
      if (itemJsonUrl) {
        await sleep(LOC_REQUEST_DELAY_MS);
        const itemData = await fetchJsonWithRetry(itemJsonUrl);
        const res = itemData?.resources?.find(
          (r: any) => typeof r?.url === "string" && r.url.includes("/resource/")
        );
        if (res?.url) resourceUrl = res.url;
      }
    }

    const resourceJsonUrl = ensureFoJson(resourceUrl);
    if (!resourceJsonUrl) return null;

    await sleep(LOC_REQUEST_DELAY_MS);
    logStep("    LOC resource request…");
    const resourceData = await fetchJsonWithRetry(resourceJsonUrl);

    const pdfUrl = findPdfUrl(resourceData);
    const imageUrl = findImageUrl(resourceData, pdfUrl);
    if (!imageUrl) return null;

    const rawPageUrl =
      typeof item.url === "string" ? item.url
      : typeof resourceUrl === "string" ? resourceUrl
      : typeof item.id === "string" ? item.id
      : null;

    const sourceTitle = normalizeTitle(item.title || item.heading);
    const sourceDate = Array.isArray(item.dates) ? item.dates.join(" ") : item.date || item.dates;

    return {
      item,
      pdfUrl,
      imageUrl,
      pageUrl: rawPageUrl?.replace(/\?[^#]*$/, "") ?? null,
      source:
        [sourceTitle, sourceDate].filter(Boolean).join(", ") ||
        "Chronicling America (loc.gov) / Library of Congress",
    };
  }

  // Stage 3: OCR the image, return raw clippings
  private async runOcr(resource: LocResource): Promise<OcrClipping[]> {
    await sleep(LOC_REQUEST_DELAY_MS);
    logStep("    Gemini OCR request via AI Gateway…");
    return ocrWithGemini(resource.imageUrl, this.promptConfig);
  }

  // Stage 4: turn raw clippings into deduplicated Snippets and accumulate
  private collectSnippets(resource: LocResource, clippings: OcrClipping[]): void {
    if (!clippings.length) {
      logStep("  No clippings returned by OCR");
      return;
    }
    for (const clipping of clippings) {
      if (this.done) break;

      const body = normalizeTitle(clipping?.body || "");
      const subHeading = normalizeTitle(
        clipping?.["sub-heading"] || clipping?.subheading || clipping?.subHeading || ""
      );
      const excerpt = excerptFromClipping(subHeading ? `${subHeading} — ${body}` : body);
      if (!excerpt) {
        logStep(`  Skipping clipping "${clipping?.headline}" — body too short (${body.split(" ").length} words)`);
        continue;
      }

      const headline =
        [clipping?.headline]
          .map((h) => normalizeTitle(h || ""))
          .find((h) => h && !isLameTitle(h))
        ?? deriveHeadlineFromText(excerpt);

      const dedupeKey = `${normalizeTitle(resource.item.title || resource.item.heading)}::${excerpt.slice(0, 90)}`;
      if (this.seen.has(dedupeKey)) {
        logStep(`  Skipping clipping "${headline}" — duplicate`);
        continue;
      }
      this.seen.add(dedupeKey);

      this.snippets.push({
        headline,
        text: excerpt,
        pdfUrl: resource.pdfUrl ?? undefined,
        imageUrl: resource.imageUrl,
        pageUrl: resource.pageUrl ?? undefined,
        source: resource.source,
        real: true,
      });
      logStep(`  Added real snippet (${this.snippets.length}/${this.count})`);
    }
  }

  // Coordinate one query through all stages
  private async processQuery(query: string): Promise<void> {
    logStep(`Searching: "${query}"…`);
    const items = await this.search(query);

    for (const item of items) {
      if (this.done) break;
      try {
        logStep(`  Processing item ${this.snippets.length + 1}/${this.count}`);
        const resource = await this.resolveResource(item);
        if (!resource) continue;
        const clippings = await this.runOcr(resource);
        this.collectSnippets(resource, clippings);
      } catch {
        continue;
      }
    }
  }
}

export { LocPipeline };
