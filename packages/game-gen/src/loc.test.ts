/**
 * Tests for LOC image URL resolution logic.
 *
 * Unit tests run instantly with no network.
 * The integration test at the bottom hits the real Chronicling America API
 * and verifies the resolved JPEG URL is actually fetchable.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { findImageUrl, findPdfUrl, iiifToJpeg, resolveResourceUrl } from "./loc-urls.js";

// ---------------------------------------------------------------------------
// iiifToJpeg
// ---------------------------------------------------------------------------

test("iiifToJpeg: appends image params to a bare IIIF service URL", () => {
  const base =
    "https://tile.loc.gov/image-services/iiif/service:ndnp:dlc:batch_dlc_east_ver01:data:sn84026749";
  assert.equal(iiifToJpeg(base), `${base}/full/pct:25/0/default.jpg`);
});

test("iiifToJpeg: replaces existing image params with normalized ones", () => {
  const base = "https://tile.loc.gov/image-services/iiif/service:ndnp:dlc:batch_xxx";
  assert.equal(
    iiifToJpeg(`${base}/full/pct:100/0/default.jp2`),
    `${base}/full/pct:25/0/default.jpg`
  );
});

// ---------------------------------------------------------------------------
// findPdfUrl
// ---------------------------------------------------------------------------

test("findPdfUrl: returns the top-level pdf field directly", () => {
  assert.equal(
    findPdfUrl({ pdf: "https://example.com/page.pdf" }),
    "https://example.com/page.pdf"
  );
});

test("findPdfUrl: finds a PDF in the resources array", () => {
  assert.equal(
    findPdfUrl({
      resources: [{ url: "https://example.com/page.pdf", file: "page.jp2" }],
    }),
    "https://example.com/page.pdf"
  );
});

test("findPdfUrl: returns null when no PDF is present", () => {
  assert.equal(findPdfUrl({ resources: [{ url: "https://example.com/page.jpg" }] }), null);
});

// ---------------------------------------------------------------------------
// findImageUrl — priority order
// ---------------------------------------------------------------------------

test("findImageUrl: prefers a direct JPEG over an IIIF URL", () => {
  const data = {
    resources: [
      { url: "https://tile.loc.gov/image-services/iiif/service:ndnp:xxx" },
      { url: "https://example.com/page.jpg" },
    ],
  };
  assert.equal(findImageUrl(data, null), "https://example.com/page.jpg");
});

test("findImageUrl: converts a bare IIIF service URL to a JPEG image request", () => {
  const data = {
    resources: [{ url: "https://tile.loc.gov/image-services/iiif/service:ndnp:dlc:batch_xxx" }],
  };
  assert.equal(
    findImageUrl(data, null),
    "https://tile.loc.gov/image-services/iiif/service:ndnp:dlc:batch_xxx/full/pct:25/0/default.jpg"
  );
});

test("findImageUrl: converts a .jp2 Chronicling America URL to its .jpg sibling", () => {
  const data = {
    resources: [
      {
        url: "https://chroniclingamerica.loc.gov/lccn/sn84026749/1906-10-09/ed-1/seq-1.jp2",
      },
    ],
  };
  assert.equal(
    findImageUrl(data, null),
    "https://chroniclingamerica.loc.gov/lccn/sn84026749/1906-10-09/ed-1/seq-1.jpg"
  );
});

test("findImageUrl: falls back to a PDF-adjacent JPEG when no image candidates exist", () => {
  assert.equal(
    findImageUrl(
      {},
      "https://chroniclingamerica.loc.gov/lccn/sn84026749/1906-10-09/ed-1/seq-1.pdf"
    ),
    "https://chroniclingamerica.loc.gov/lccn/sn84026749/1906-10-09/ed-1/seq-1.jpg"
  );
});

test("findImageUrl: returns null when no image can be derived", () => {
  assert.equal(findImageUrl({}, null), null);
});

test("findImageUrl: finds a JPEG nested under item.resources", () => {
  const data = {
    item: { resources: [{ url: "https://example.com/nested.jpg" }] },
  };
  assert.equal(findImageUrl(data, null), "https://example.com/nested.jpg");
});

test("findImageUrl: finds a JPEG listed in the page array", () => {
  const data = {
    page: [{ url: "https://example.com/from-page.jpg" }],
  };
  assert.equal(findImageUrl(data, null), "https://example.com/from-page.jpg");
});

// ---------------------------------------------------------------------------
// Integration — real LOC API (mirrors the pipeline's search → resolve flow)
// ---------------------------------------------------------------------------

test(
  "integration: LOC search resolves a real item to an accessible JPEG URL",
  { timeout: 30_000 },
  async () => {
    const headers = { "User-Agent": "newspaper-game/1.0 (integration-test)" };

    // Stage 1: search (same API and params the pipeline uses)
    const searchUrl =
      "https://www.loc.gov/collections/chronicling-america/?" +
      new URLSearchParams({ q: "election", dates: "1900-1910", c: "5", fo: "json" });

    const searchRes = await fetch(searchUrl.toString(), { headers });
    assert.ok(searchRes.ok, `LOC search failed: ${searchRes.status}`);
    const searchData = await searchRes.json();

    const items: any[] = searchData.results ?? searchData.items ?? [];
    assert.ok(items.length > 0, "expected at least one LOC search result");

    // Stage 2: resolve the first item that has a resource URL + image
    let imageUrl: string | null = null;
    for (const item of items.slice(0, 5)) {
      const resourceUrl = resolveResourceUrl(item);
      if (!resourceUrl) continue;

      const resourceJsonUrl =
        resourceUrl + (resourceUrl.includes("?") ? "&" : "?") + "fo=json";

      const resourceRes = await fetch(resourceJsonUrl, { headers });
      if (!resourceRes.ok) continue;

      const resourceData = await resourceRes.json();
      imageUrl = findImageUrl(resourceData, findPdfUrl(resourceData));
      if (imageUrl) break;
    }

    assert.ok(imageUrl, "expected at least one item to yield a resolvable image URL");
    assert.match(imageUrl!, /(\.jpg|\.jpeg)(\?|#|$)/i, "expected a JPEG URL");

    // Stage 3: verify the resolved URL is actually reachable
    const imgRes = await fetch(imageUrl!, { method: "HEAD", headers });
    assert.ok(imgRes.ok, `image URL returned ${imgRes.status}: ${imageUrl}`);
  }
);
