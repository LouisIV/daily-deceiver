import {
  ANTHROPIC_API_KEY,
  AI_GATEWAY_API_KEY,
  ANTHROPIC_MODEL_GEN,
  ANTHROPIC_MODEL_SCORE,
  FORCE_GENERATE,
  LOCAL_MODE,
  MIN_SCORE,
  OVERFETCH_FAKE,
  OVERFETCH_REAL,
  SKIP_LOC,
  TARGET_REAL,
  TARGET_TOTAL,
} from "./config.js";
import { fetchRealSnippets } from "./loc.js";
import { generateFakeSnippets, scoreSnippetsWithClaude } from "./anthropic.js";
import { buildPayload, shouldGenerateFromBlobFlag, writePayload } from "./storage.js";
import type { Snippet } from "./types.js";
import { heuristicRejectSnippet, logStep } from "./utils.js";

if (!ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

if (!AI_GATEWAY_API_KEY && !SKIP_LOC) {
  console.error("Missing AI_GATEWAY_API_KEY (or VERCEL_OIDC_TOKEN) for OCR");
  process.exit(1);
}

if (LOCAL_MODE && !process.env.BLOB_READ_WRITE_TOKEN) {
  console.log("No BLOB_READ_WRITE_TOKEN — running in local mode.");
}

async function main() {
  logStep(`Generating daily game (${LOCAL_MODE ? "local" : "blob"} mode)…`);
  logStep(`Using Anthropic model (gen): ${ANTHROPIC_MODEL_GEN}`);
  logStep(`Using Anthropic model (score): ${ANTHROPIC_MODEL_SCORE}`);

  if (!LOCAL_MODE && !FORCE_GENERATE) {
    const shouldGenerate = await shouldGenerateFromBlobFlag();
    if (!shouldGenerate) process.exit(0);
  } else if (FORCE_GENERATE) {
    logStep("Force mode enabled (--force). Ignoring play flag.");
  }

  let runGenIn = 0;
  let runGenOut = 0;
  let runScoreIn = 0;
  let runScoreOut = 0;

  let realsFiltered: Snippet[] = [];
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

  const scoreResult = await scoreSnippetsWithClaude([...realsFiltered, ...fakesFiltered], "total");
  runScoreIn += scoreResult.usage.input_tokens || 0;
  runScoreOut += scoreResult.usage.output_tokens || 0;
  const scores = scoreResult.scores as Array<{ id: number; score: number }>;
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
    logStep(
      `Anthropic run total: gen_in=${runGenIn} gen_out=${runGenOut} ` +
        `score_in=${runScoreIn} score_out=${runScoreOut}`
    );
  }

  const payload = buildPayload(snippets);
  await writePayload(payload);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
