"use client";

export function NewsButton({
  onClick,
  label,
  emoji,
  hint,
  color,
}: {
  onClick: () => void;
  label: string;
  emoji: string;
  hint: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: color,
        color: "var(--cream)",
        border: "none",
        padding: "0",
        fontFamily: "'Playfair Display',Georgia,serif",
        minWidth: 140,
        boxShadow: "3px 4px 0 rgba(0,0,0,0.35)",
        transition: "filter 0.15s, transform 0.1s",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.2)",
          margin: 4,
          padding: "14px 20px",
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
        <div
          style={{
            fontSize: "clamp(16px,3vw,20px)",
            fontWeight: 900,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 10, opacity: 0.55, letterSpacing: 2, marginTop: 2 }}>
          [{hint}]
        </div>
      </div>
    </button>
  );
}
