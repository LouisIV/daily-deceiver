import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import {
  AI_GATEWAY_API_KEY,
  AI_GATEWAY_BASE_URL,
  FAKE_GENERATION_MODEL,
  SCORE_MODEL,
  PRICE_PER_MTOK_IN_GEN,
  PRICE_PER_MTOK_OUT_GEN,
  PRICE_PER_MTOK_IN_SCORE,
  PRICE_PER_MTOK_OUT_SCORE,
} from "./config.js";
import type { Snippet } from "./types.js";
import { estimateCostUsd, logStep } from "./utils.js";

const gatewayProvider = createOpenAI({
  apiKey: AI_GATEWAY_API_KEY,
  baseURL: AI_GATEWAY_BASE_URL,
});

const snippetSchema = z.object({
  snippets: z.array(
    z.object({
      headline: z.string(),
      text: z.string(),
    })
  ),
});

const scoreSchema = z.object({
  scores: z.array(
    z.object({
      id: z.number().int(),
      score: z.number(),
    })
  ),
});

async function generateFakeSnippets(
  count = 5
): Promise<{ snippets: Snippet[]; usage: { input_tokens: number; output_tokens: number } }> {
  logStep(`Generating ${count} fake snippets via Claude…`);

  const result = await generateText({
    model: gatewayProvider(FAKE_GENERATION_MODEL),
    experimental_output: Output.object({ schema: snippetSchema }),
    system: `Generate fake 19th-century American small-town newspaper snippets for a trivia game.
Each needs a short punchy headline (4-8 words ALL CAPS) and body text (40-120 words).
Sound authentically period-appropriate (1875-1920), plausible but subtly amusing.
Vary types: notices, news items, social columns, want ads, editorial comments.`.trim(),
    prompt: `Generate ${count} fake 19th-century American newspaper snippets.`,
  });

  const inTok = result.usage.inputTokens ?? 0;
  const outTok = result.usage.outputTokens ?? 0;
  const cost = estimateCostUsd(inTok, outTok, PRICE_PER_MTOK_IN_GEN, PRICE_PER_MTOK_OUT_GEN);
  logStep(`  Anthropic generate usage: in=${inTok} out=${outTok} cost=$${cost.toFixed(4)}`);

  return {
    snippets: result.output.snippets.slice(0, count).map((o) => ({
      headline: o.headline || "NOTICE TO THE PUBLIC",
      text: String(o.text),
      real: false,
    })),
    usage: { input_tokens: inTok, output_tokens: outTok },
  };
}

async function scoreSnippets(snippets: Snippet[], label: string) {
  if (!snippets.length) return { scores: [], usage: { input_tokens: 0, output_tokens: 0 } };
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

    const result = await generateText({
      model: gatewayProvider(SCORE_MODEL),
      experimental_output: Output.object({ schema: scoreSchema }),
      system: `You are a strict editor. Score each snippet 1-10 for readability and authenticity.
Reject OCR garbage, broken words, excessive noise, or non-headline text.`,
      prompt: `Score this batch:\n${JSON.stringify(payload)}`,
    });

    totalIn += result.usage.inputTokens ?? 0;
    totalOut += result.usage.outputTokens ?? 0;
    for (const item of result.output.scores) {
      results.push(item);
    }
  }

  if (totalIn || totalOut) {
    const cost = estimateCostUsd(totalIn, totalOut, PRICE_PER_MTOK_IN_SCORE, PRICE_PER_MTOK_OUT_SCORE);
    logStep(`Anthropic scoring usage total: in=${totalIn} out=${totalOut} cost=$${cost.toFixed(4)}`);
  }

  return { scores: results, usage: { input_tokens: totalIn, output_tokens: totalOut } };
}

export { generateFakeSnippets, scoreSnippets };
