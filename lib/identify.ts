import { dedupe } from 'flags/next';
import type { ReadonlyRequestCookies } from 'flags';

interface Entities {
  user?: {
    id: string;
  };
}

export const identify = dedupe(
  ({ cookies }: { cookies: ReadonlyRequestCookies }): Entities => {
    const userId = cookies.get('ph_pid')?.value;

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
