/**
 * Server-only share token encoding/decoding. Uses Node's built-in zlib and crypto.
 * Do not import from client code.
 */

import { gzipSync, gunzipSync } from "node:zlib";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { SharePayload } from "./share";
import {
  DEFAULT_PAYLOAD,
  normalizeSharePayload,
} from "./share";

const GZIP_MAGIC = Buffer.from([0x1f, 0x8b]);
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;
const ALGO = "aes-256-gcm";

function getKey(secret: string): Buffer {
  const raw = Buffer.from(secret, "utf8");
  if (raw.length < 32) {
    const key = Buffer.alloc(32);
    raw.copy(key);
    return key;
  }
  return raw.subarray(0, 32);
}

export type DecodeShareOptions = {
  /** When true, only accept encrypted tokens (used in production). */
  requireEncryption?: boolean;
};

/**
 * Decode share token: supports (1) encrypted+gzip, (2) gzip only, (3) legacy plain base64 JSON.
 * When requireEncryption is true (e.g. in production), only encrypted tokens are accepted.
 */
export function decodeSharePayloadToken(
  token: string,
  secret?: string,
  options?: DecodeShareOptions,
): SharePayload {
  const { requireEncryption = false } = options ?? {};
  if (!token || typeof token !== "string") return { ...DEFAULT_PAYLOAD };

  let raw: Buffer;
  try {
    let b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    raw = Buffer.from(b64, "base64");
  } catch {
    return { ...DEFAULT_PAYLOAD };
  }

  if (raw.length === 0) return { ...DEFAULT_PAYLOAD };

  // 1) Encrypted: IV (12) + authTag (16) + ciphertext
  if (secret && raw.length >= IV_LEN + AUTH_TAG_LEN) {
    try {
      const key = getKey(secret);
      const iv = raw.subarray(0, IV_LEN);
      const authTag = raw.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
      const ciphertext = raw.subarray(IV_LEN + AUTH_TAG_LEN);
      const decipher = createDecipheriv(ALGO, key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      const json = gunzipSync(decrypted).toString("utf8");
      return normalizeSharePayload(JSON.parse(json));
    } catch {
      if (requireEncryption) return { ...DEFAULT_PAYLOAD };
      // fall through to gzip or legacy
    }
  }

  if (requireEncryption) return { ...DEFAULT_PAYLOAD };

  // 2) Gzip only (Node's zlib format)
  if (raw[0] === GZIP_MAGIC[0] && raw[1] === GZIP_MAGIC[1]) {
    try {
      const json = gunzipSync(raw).toString("utf8");
      return normalizeSharePayload(JSON.parse(json));
    } catch {
      return { ...DEFAULT_PAYLOAD };
    }
  }

  // 3) Legacy: decoded bytes are UTF-8 of URI-encoded JSON
  try {
    const decoded = decodeURIComponent(raw.toString("utf8"));
    return normalizeSharePayload(JSON.parse(decoded));
  } catch {
    return { ...DEFAULT_PAYLOAD };
  }
}

/**
 * Encode payload into a token: gzip then optional AES-256-GCM encryption.
 * When secret is set, clients cannot decrypt the token.
 */
export function encodeSharePayloadToken(
  payload: Partial<SharePayload>,
  secret?: string,
): string {
  const merged: SharePayload = {
    ...DEFAULT_PAYLOAD,
    ...payload,
    papers: (payload.papers ?? DEFAULT_PAYLOAD.papers).slice(0, 2),
  };
  const json = JSON.stringify(merged);
  const gzipped = gzipSync(Buffer.from(json, "utf8"));

  if (secret) {
    const key = getKey(secret);
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(gzipped),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted])
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  return gzipped.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
