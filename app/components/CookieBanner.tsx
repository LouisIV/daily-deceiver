"use client";

import { useState, useEffect } from "react";
import { acceptCookies, rejectCookies, hasConsent } from "@/instrumentation-client";

export function CookieBanner({ forceShow = false }: { forceShow?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const showFromUrl = params.get("show-cookies") === "true";
    if (forceShow || showFromUrl || !hasConsent()) {
      setVisible(true);
    }
  }, [forceShow]);

  const dismissBanner = () => {
    setVisible(false);
    // Remove show-cookies query param from URL if present
    const url = new URL(window.location.href);
    if (url.searchParams.has("show-cookies")) {
      url.searchParams.delete("show-cookies");
      window.history.replaceState({}, "", url.toString());
    }
  };

  if (!mounted || !visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
      }}
      className="cookie-banner-card"
    >
      <style>{`
        @media (max-width: 768px) {
          .cookie-banner-card {
            position: fixed !important;
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
          }
          .cookie-banner-card .clipping-paper {
            max-width: 100% !important;
            transform: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
      <div
        className="clipping-paper"
        style={{
          padding: "20px 24px",
          maxWidth: 340,
          transform: "rotate(-1deg)",
        }}
      >
        <div className="clipping-paper-content">
          <div className="headline" style={{ fontSize: 18, marginBottom: 8, textAlign: "center" }}>
            Attention Readers!
          </div>
          <div className="clipping-body" style={{ fontSize: 12, opacity: 0.85, marginBottom: 12 }}>
            We employ cookies to improve your experience. Functional cookies are essential for gameplay, 
            while analytical cookies help us understand how the game is played and run experiments. No
            personal information is collected or shared.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={() => {
                acceptCookies();
                dismissBanner();
              }}
              style={{
                background: "var(--ink)",
                color: "var(--cream)",
                border: "1px solid var(--ink)",
                padding: "6px 16px",
                cursor: "pointer",
                fontFamily: "var(--font-playfair-sc), Georgia, serif",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                transform: "rotate(1deg)",
              }}
            >
              Accept
            </button>
            <button
              onClick={() => {
                rejectCookies();
                dismissBanner();
              }}
              style={{
                background: "transparent",
                color: "var(--ink)",
                border: "none",
                padding: "6px 16px",
                cursor: "pointer",
                fontFamily: "var(--font-im-fell), Georgia, serif",
                fontSize: 13,
                fontStyle: "italic",
                textDecoration: "none",
              }}
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
