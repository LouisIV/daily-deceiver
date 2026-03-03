"use client";

import { useRouter } from "next/navigation";

export function CookieSettings() {
  const router = useRouter();

  return (
    <div
      className="clipping-paper"
      style={{
        padding: "20px 24px",
        maxWidth: 400,
        marginTop: "1rem",
        transform: "rotate(-0.5deg)",
      }}
    >
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button
          onClick={() => router.push("/?show-cookies=true")}
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
          Manage Cookies
        </button>
      </div>
    </div>
  );
}
