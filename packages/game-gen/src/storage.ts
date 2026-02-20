import { writeFileSync } from "fs";
import { resolve } from "path";
import type { Snippet } from "./types.js";
import { BLOB_READ_WRITE_TOKEN, LOCAL_MODE, PLAY_FLAG_PATH } from "./config.js";
import { isBlobNotFoundError, logStep } from "./utils.js";

const REPO_ROOT = resolve(new URL("../../../", import.meta.url).pathname);

async function shouldGenerateFromBlobFlag() {
  if (LOCAL_MODE) return true;
  const { head } = await import("@vercel/blob");
  try {
    await head(PLAY_FLAG_PATH, { token: BLOB_READ_WRITE_TOKEN });
    logStep("Play flag found (no plays since last generation). Skipping generation.");
    return false;
  } catch (err) {
    if (!isBlobNotFoundError(err)) throw err;
    logStep("Play flag missing (someone played). Proceeding with generation.");
    return true;
  }
}

async function writePayload(payload: string) {
  if (LOCAL_MODE) {
    const outPath = resolve(REPO_ROOT, "public", "fallback-game.json");
    writeFileSync(outPath, payload, "utf8");
    console.log(`Done! Written to ${outPath}`);
    return;
  }

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

function buildPayload(snippets: Snippet[]) {
  return JSON.stringify(
    { snippets, generatedAt: new Date().toISOString(), date: new Date().toISOString().slice(0, 10) },
    null,
    2
  );
}

export { shouldGenerateFromBlobFlag, writePayload, buildPayload };
