import { del } from "@vercel/blob";

const PLAY_FLAG_PATH = "play-flag.txt";

export async function POST() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return new Response(null, { status: 204 });

  try {
    await del(PLAY_FLAG_PATH, { token });
  } catch {}

  return new Response(null, { status: 204 });
}
