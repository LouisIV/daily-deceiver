import { NextRequest } from "next/server";
import { detectBorderThresholds } from "@/lib/remove-borders";

export const runtime = "nodejs";

function isAllowedUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return /(^|\.)loc\.gov$/.test(hostname);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return Response.json({ error: "Missing `url` query param" }, { status: 400 });
  }
  if (!isAllowedUrl(url)) {
    return Response.json({ error: "Only loc.gov URLs are accepted" }, { status: 403 });
  }

  let imageBuffer: ArrayBuffer;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return Response.json({ error: `Upstream fetch failed: ${res.status}` }, { status: 502 });
    }
    imageBuffer = await res.arrayBuffer();
  } catch {
    return Response.json({ error: "Failed to fetch image" }, { status: 502 });
  }

  const thresholds = await detectBorderThresholds(imageBuffer);

  return Response.json(thresholds, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
