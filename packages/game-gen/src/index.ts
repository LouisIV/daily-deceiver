import {
  AI_GATEWAY_API_KEY,
  FAKE_GENERATION_MODEL,
  GEMINI_OCR_MODEL,
  SCORE_MODEL,
  FORCE_GENERATE,
  LOCAL_MODE,
  MIN_SCORE,
  OVERFETCH_FAKE,
  OVERFETCH_REAL,
  REAL_SCORE_SAMPLE,
  SKIP_LOC,
  TARGET_REAL,
  TARGET_TOTAL,
} from "./config.js";
import { fetchRealSnippets } from "./loc.js";
import { generateFakeSnippets, scoreSnippets } from "./fakes-generation.js";
import { buildPayload, shouldGenerateFromBlobFlag, writePayload, writeReport } from "./storage.js";
import type { Snippet } from "./types.js";
import { heuristicRejectSnippet, logStep } from "./utils.js";

if (!AI_GATEWAY_API_KEY) {
  console.error("Missing AI_GATEWAY_API_KEY (or VERCEL_OIDC_TOKEN)");
  process.exit(1);
}

if (LOCAL_MODE && !process.env.BLOB_READ_WRITE_TOKEN) {
  console.log("No BLOB_READ_WRITE_TOKEN — running in local mode.");
}

async function main() {
  logStep(`Generating daily game (${LOCAL_MODE ? "local" : "blob"} mode)…`);
  logStep(`Using fake generation model: ${FAKE_GENERATION_MODEL}`);
  logStep(`Using score model: ${SCORE_MODEL}`);

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

  const report: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
    mode: LOCAL_MODE ? "local" : "blob",
    models: { ocr: GEMINI_OCR_MODEL, fakeGeneration: FAKE_GENERATION_MODEL, scoring: SCORE_MODEL },
  };

  let realsFiltered: Snippet[] = [];
  if (SKIP_LOC) {
    logStep("Skipping LOC fetch (--skip-loc)");
  } else {
    logStep("Fetching real snippets from Chronicling America…");
    const realsRaw = await fetchRealSnippets(OVERFETCH_REAL);
    const realRejections: Record<string, number> = {};
    realsFiltered = realsRaw.filter((s) => {
      const reason = heuristicRejectSnippet(s);
      if (reason) {
        realRejections[reason] = (realRejections[reason] ?? 0) + 1;
        return false;
      }
      return true;
    });
    if (Object.keys(realRejections).length) {
      logStep(`Heuristic rejections: ${JSON.stringify(realRejections)}`);
    }
    logStep(`Got ${realsFiltered.length} real snippets after heuristic filter`);
    realsFiltered = realsFiltered.sort(() => Math.random() - 0.5).slice(0, REAL_SCORE_SAMPLE);
    logStep(`Randomly sampled ${realsFiltered.length} reals for scoring`);
    report.reals = { fetched: realsRaw.length, rejections: realRejections, passedHeuristic: realsFiltered.length };
  }

  logStep(`Generating ${OVERFETCH_FAKE} fake snippets…`);
  const fakeResult = await generateFakeSnippets(OVERFETCH_FAKE);
  runGenIn += fakeResult.usage.input_tokens || 0;
  runGenOut += fakeResult.usage.output_tokens || 0;
  const fakeRejections: Record<string, number> = {};
  const fakesFiltered = fakeResult.snippets.filter((s) => {
    const reason = heuristicRejectSnippet(s);
    if (reason) {
      fakeRejections[reason] = (fakeRejections[reason] ?? 0) + 1;
      return false;
    }
    return true;
  });
  logStep(`Got ${fakesFiltered.length} fake snippets after heuristic filter`);
  report.fakes = { generated: fakeResult.snippets.length, rejections: fakeRejections, passedHeuristic: fakesFiltered.length };

  const scoreResult = await scoreSnippets([...realsFiltered, ...fakesFiltered], "total");
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

  report.scoring = {
    realsAboveThreshold: scoredReals.length,
    fakesAboveThreshold: scoredFakes.length,
    selectedReals: selectedReals.length,
    selectedFakes: selectedFakes.length,
  };
  report.tokenUsage = { genIn: runGenIn, genOut: runGenOut, scoreIn: runScoreIn, scoreOut: runScoreOut };
  report.snippets = snippets;

  if (runGenIn || runGenOut || runScoreIn || runScoreOut) {
    logStep(
      `Anthropic run total: gen_in=${runGenIn} gen_out=${runGenOut} ` +
        `score_in=${runScoreIn} score_out=${runScoreOut}`
    );
  }

  const payload = buildPayload(snippets);
  await writePayload(payload);
  writeReport(report);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
