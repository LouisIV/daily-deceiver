"use client";

import { useMemo } from "react";
import { thumbHashToDataURL } from "thumbhash";

interface ThumbhashPlaceholderProps {
  hash: string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

/**
 * Renders a thumbhash placeholder as an image.
 * The hash should be a base64-encoded thumbhash string.
 */
export function ThumbhashPlaceholder({
  hash,
  className,
  style,
  alt = "Loading...",
}: ThumbhashPlaceholderProps) {
  const dataUrl = useMemo(() => {
    try {
      const hashBuffer = Buffer.from(hash, "base64");
      return thumbHashToDataURL(hashBuffer);
    } catch {
      return null;
    }
  }, [hash]);

  if (!dataUrl) {
    return (
      <div
        className={className}
        style={{
          ...style,
          backgroundColor: "#e8d9b8",
        }}
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      className={className}
      style={{
        ...style,
        filter: "blur(8px)",
        transform: "scale(1.1)",
      }}
    />
  );
}
