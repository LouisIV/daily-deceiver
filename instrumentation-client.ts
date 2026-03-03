import posthog from "posthog-js";

const COOKIE_CONSENT_KEY = "cookie_consent";

const isDevelopment = process.env.NODE_ENV === "development";

function hasGivenConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(COOKIE_CONSENT_KEY) === "granted";
}

if (!isDevelopment) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: false,
    loaded: (posthog) => {
      if (!hasGivenConsent()) {
        posthog.opt_out_capturing();
      }
    },
  });
}

export function acceptCookies() {
  localStorage.setItem(COOKIE_CONSENT_KEY, "granted");
  if (isDevelopment) return;
  posthog.opt_in_capturing();
}

export function rejectCookies() {
  localStorage.setItem(COOKIE_CONSENT_KEY, "denied");
  if (isDevelopment) return;
  posthog.opt_out_capturing();
}

export function hasConsent(): boolean {
  return hasGivenConsent();
}
