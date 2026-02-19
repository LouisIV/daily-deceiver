"use client";

import type { ReactNode } from "react";

export function StampButton({
  onClick,
  color,
  children,
}: {
  onClick: () => void | Promise<void>;
  color: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: color,
        color: "var(--cream)",
        border: "none",
        padding: "12px 36px",
        fontFamily: "'Playfair Display SC',Georgia,serif",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: 3,
        textTransform: "uppercase",
        boxShadow: "3px 4px 0 rgba(0,0,0,0.35)",
        transition: "filter 0.15s",
      }}
    >
      {children}
    </button>
  );
}
