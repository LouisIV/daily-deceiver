import { head, put } from "@vercel/blob";
import { createHash } from "crypto";
import { getPostHogClient } from "@/lib/posthog-server";

const PREFIX = "clipping-reports";
const BY_CLIPPING_PREFIX = `${PREFIX}/by-clipping`;

/** Minimal snippet fields we store and use for identity/hashing */
type SnippetPayload = {
  headline: string;
  text: string;
  subheading?: string;
  source?: string;
  pageUrl?: string;
  pdfUrl?: string;
  imageUrl?: string;
  url?: string;
  real: boolean;
};

type ReportBody = {
  snippet: SnippetPayload;
  reasonPreset: string;
  reasonText?: string;
};

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Canonical JSON (sorted keys) for deterministic hashing */
function canonicalJson(obj: Record<string, unknown>): string {
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    const v = obj[k];
    if (v !== undefined && v !== null) sorted[k] = v;
  }
  return JSON.stringify(sorted);
}

/** Identity of the clipping for de-dupe (one report per clipping) */
function clippingId(snippet: SnippetPayload): string {
  const canonical = {
    headline: snippet.headline,
    text: snippet.text,
    subheading: snippet.subheading ?? "",
    source: snippet.source ?? "",
    pageUrl: snippet.pageUrl ?? "",
    pdfUrl: snippet.pdfUrl ?? "",
    imageUrl: snippet.imageUrl ?? "",
    url: snippet.url ?? "",
  };
  return sha256Hex(canonicalJson(canonical));
}

export async function POST(request: Request) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return Response.json(
      { error: "Reporting is not configured" },
      { status: 503 }
    );
  }

  let body: ReportBody;
  try {
    body = (await request.json()) as ReportBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { snippet, reasonPreset, reasonText } = body;
  if (!snippet || typeof snippet.headline !== "string" || typeof snippet.text !== "string") {
    return Response.json(
      { error: "Missing or invalid snippet (headline, text required)" },
      { status: 400 }
    );
  }
  if (!reasonPreset || typeof reasonPreset !== "string") {
    return Response.json(
      { error: "reasonPreset is required" },
      { status: 400 }
    );
  }

  const snippetForStorage = {
    headline: snippet.headline,
    text: snippet.text,
    subheading: snippet.subheading,
    source: snippet.source,
    pageUrl: snippet.pageUrl,
    pdfUrl: snippet.pdfUrl,
    imageUrl: snippet.imageUrl,
    url: snippet.url,
    real: Boolean(snippet.real),
  };

  const reasonTextTrimmed = reasonText?.trim() || undefined;
  const payloadForHash = {
    snippet: snippetForStorage,
    reasonPreset,
    reasonText: reasonTextTrimmed,
  };
  const payloadHash = sha256Hex(canonicalJson(payloadForHash as unknown as Record<string, unknown>));
  const clipId = clippingId(snippetForStorage);

  try {
    const indexPath = `${BY_CLIPPING_PREFIX}/${clipId}.txt`;
    try {
      await head(indexPath, { token });
      return Response.json(
        { duplicate: true, reason: "clipping" },
        { status: 409 }
      );
    } catch {
      // Index missing = clipping not yet reported
    }

    const reportPath = `${PREFIX}/${payloadHash}.json`;
    try {
      await head(reportPath, { token });
      return Response.json(
        { duplicate: true, reason: "payload" },
        { status: 200 }
      );
    } catch {
      // Report blob missing = new report
    }

    const storedPayload = {
      ...payloadForHash,
      reportedAt: new Date().toISOString(),
    };
    const blob = await put(reportPath, JSON.stringify(storedPayload, null, 2), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      token,
    });

    await put(indexPath, payloadHash, {
      access: "public",
      addRandomSuffix: false,
      contentType: "text/plain; charset=utf-8",
      token,
    });

    const distinctId =
      request.headers.get("x-posthog-distinct-id") || "anonymous";
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId,
      event: "clipping_issue_reported",
      properties: {
        payload_hash: payloadHash,
        clipping_id: clipId,
        reason_preset: reasonPreset,
        has_reason_text: Boolean(payloadForHash.reasonText),
        blob_url: blob.url,
        headline: snippetForStorage.headline,
        clipping_is_real: snippetForStorage.real,
      },
    });
    await posthog.shutdown();

    return Response.json(
      { duplicate: false, blobUrl: blob.url },
      { status: 201 }
    );
  } catch (e) {
    console.error("clipping-reports error:", e);
    return Response.json(
      { error: "Failed to store report" },
      { status: 500 }
    );
  }
}
