import { put } from "@vercel/blob";

const PLAY_FLAG_PATH = "play-flag.txt";

export async function POST() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return new Response(null, { status: 204 });

  try {
    await put(PLAY_FLAG_PATH, String(Date.now()), {
      access: "public",
      addRandomSuffix: false,
      contentType: "text/plain; charset=utf-8",
      token,
    });
  } catch {}

  return new Response(null, { status: 204 });
}
