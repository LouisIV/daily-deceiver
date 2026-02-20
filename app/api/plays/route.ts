import { del } from "@vercel/blob";
import { getPostHogClient } from "@/lib/posthog-server";

const PLAY_FLAG_PATH = "play-flag.txt";

export async function POST(request: Request) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return new Response(null, { status: 204 });

  try {
    await del(PLAY_FLAG_PATH, { token });
  } catch {}

  // Track the play server-side using the client's PostHog distinct ID if provided
  try {
    const distinctId =
      request.headers.get("x-posthog-distinct-id") || "anonymous";
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId,
      event: "play_recorded",
      properties: {
        source: "api",
      },
    });
    await posthog.shutdown();
  } catch {}

  return new Response(null, { status: 204 });
}
