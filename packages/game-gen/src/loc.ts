import type { Snippet } from "./types.js";
import { LocPipeline } from "./loc-pipeline.js";
import { findImageUrl, findPdfUrl, iiifToJpeg } from "./loc-urls.js";

async function fetchRealSnippets(count = 5): Promise<Snippet[]> {
  return new LocPipeline(count).run();
}

export { fetchRealSnippets, findImageUrl, findPdfUrl, iiifToJpeg };
