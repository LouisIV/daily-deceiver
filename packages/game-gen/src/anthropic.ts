import {
  ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL_GEN,
  ANTHROPIC_MODEL_SCORE,
  PRICE_PER_MTOK_IN_GEN,
  PRICE_PER_MTOK_OUT_GEN,
  PRICE_PER_MTOK_IN_SCORE,
  PRICE_PER_MTOK_OUT_SCORE,
} from "./config.js";
import type { Snippet } from "./types.js";
import { estimateCostUsd, logStep } from "./utils.js";

async function generateFakeSnippets(
  count = 5
): Promise<{ snippets: Snippet[]; usage: { input_tokens: number; output_tokens: number } }> {
  const apiKey = ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  logStep(`Generating ${count} fake snippets via Claude…`);

  const makeRequest = async (batchCount: number, extraInstruction: string) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
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

  const parseJsonArray = (rawText: unknown): Array<{ headline?: string; text?: string }> | null => {
    const text = String(rawText || "").trim();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  };

  let data: any = null;
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
    let parsed: Array<{ headline?: string; text?: string }> | null = null;
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

async function scoreSnippetsWithClaude(snippets: Snippet[], label: string) {
  if (!snippets.length) return { scores: [], usage: { input_tokens: 0, output_tokens: 0 } };
  const apiKey = ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  logStep(`Scoring ${snippets.length} ${label} snippets via Claude…`);

  const batchSize = 20;
  const results: Array<{ id: number; score: number }> = [];
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
        "x-api-key": apiKey,
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

    const data: any = await res.json();
    const usage = data.usage || {};
    totalIn += usage.input_tokens || 0;
    totalOut += usage.output_tokens || 0;
    const text = data.content?.[0]?.text || "";
    let parsed: Array<{ id: number; score: number }> = [];
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
    logStep(`Anthropic scoring usage total: in=${totalIn} out=${totalOut} cost=$${cost.toFixed(4)}`);
  }

  return { scores: results, usage: { input_tokens: totalIn, output_tokens: totalOut } };
}

export { generateFakeSnippets, scoreSnippetsWithClaude };
