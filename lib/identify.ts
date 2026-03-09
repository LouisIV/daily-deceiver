import { dedupe } from 'flags/next';
import type { ReadonlyRequestCookies } from 'flags';

interface Entities {
  user?: {
    id: string;
  };
}

export const identify = dedupe(
  ({ cookies }: { cookies: ReadonlyRequestCookies }): Entities => {
    const cookieName = `ph_${process.env.NEXT_PUBLIC_POSTHOG_KEY}_posthog`;
    const raw = cookies.get(cookieName)?.value;
    const parsed = raw ? JSON.parse(decodeURIComponent(raw)) : null;
    const userId = parsed?.distinct_id;

    if (!userId) {
      return {};
    }

    return {
      user: {
        id: userId,
      },
    };
  }
);
