"use client";

import { useEffect, useState } from "react";

import { StampButton } from "./StampButton";

export function LoadScreen({
  progress,
  error,
  retry,
}: {
  progress: string;
  error: string | null;
  retry: () => void | Promise<void>;
}) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      600
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "56px 20px" }}>
      {error ? (
        <>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            The Presses Have Jammed
          </div>
          <div
            className="clipping-body"
            style={{
              fontStyle: "italic",
              opacity: 0.7,
              maxWidth: 360,
              margin: "0 auto 24px",
            }}
          >
            {error}
          </div>
          <StampButton onClick={retry} color="var(--ink)">
            Try Again
          </StampButton>
        </>
      ) : (
        <>
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid var(--ink)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              margin: "0 auto 20px",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <div
            className="subhead"
            style={{ animation: "blink 1.4s ease infinite", fontSize: 11 }}
          >
            {progress}
            {dots}
          </div>
          <div
            className="clipping-body"
            style={{
              fontStyle: "italic",
              opacity: 0.4,
              fontSize: 12,
              marginTop: 14,
            }}
          >
            Searching the Library of Congress archives
            <br />
            This takes about 30 seconds
          </div>
        </>
      )}
    </div>
  );
}
