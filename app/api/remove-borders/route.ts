import { NextRequest } from "next/server";
import {
  removeBorders,
  removeBlackBorders,
  removeWhiteBorders,
} from "@/lib/remove-borders";

export const runtime = "nodejs";

function isAllowedUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return /(^|\.)loc\.gov$/.test(hostname);
  } catch {
    return false;
  }
}

function parseThreshold(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return isNaN(n) ? undefined : Math.max(0, Math.min(255, n));
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new Response("Missing `url` query param", { status: 400 });
  }
  if (!isAllowedUrl(url)) {
    return new Response("Only loc.gov URLs are accepted", { status: 403 });
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "both";
  if (!["black", "white", "both"].includes(mode)) {
    return new Response("mode must be black, white, or both", { status: 400 });
  }

  // Undefined = auto-detect from the image itself
  const blackThreshold = parseThreshold(req.nextUrl.searchParams.get("blackThreshold"));
  const whiteThreshold = parseThreshold(req.nextUrl.searchParams.get("whiteThreshold"));

  let imageBuffer: ArrayBuffer;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return new Response(`Upstream fetch failed: ${res.status}`, { status: 502 });
    }
    imageBuffer = await res.arrayBuffer();
  } catch {
    return new Response("Failed to fetch image", { status: 502 });
  }

  const result =
    mode === "black"
      ? await removeBlackBorders(imageBuffer, blackThreshold)
      : mode === "white"
      ? await removeWhiteBorders(imageBuffer, whiteThreshold)
      : await removeBorders(imageBuffer, { blackThreshold, whiteThreshold });

  return new Response(new Uint8Array(result.png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      // Expose the thresholds that were actually used (auto or explicit)
      "X-Black-Threshold": String(result.blackThreshold),
      "X-White-Threshold": String(result.whiteThreshold),
      "Access-Control-Expose-Headers": "X-Black-Threshold, X-White-Threshold",
    },
  });
}
