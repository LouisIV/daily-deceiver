import { PostHog } from "posthog-node";

export function getPostHogClient(): PostHog {
  const client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}
