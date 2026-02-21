/**
 * Reusable "databend" glitch effect for OG images: horizontal slice offsets
 * plus an optional gradient Bayer overlay. Wrap any content in DatabendEffect
 * or use DatabendHeadline for a full line of words with optional overlay.
 */

/** Default offset pattern per slice: alternating sign, last slice slightly stronger */
const DEFAULT_OFFSET_PATTERN = [1, 1, 2, 1];

function getSliceClipPath(slices: number, index: number): string {
  const top = (index / slices) * 100;
  const bottom = ((index + 1) / slices) * 100;
  return `polygon(0% ${top}%,100% ${top}%,100% ${bottom}%,0% ${bottom}%)`;
}

function getSliceOffsets(slices: number, intensity: number): number[] {
  const pattern = DEFAULT_OFFSET_PATTERN.slice(0, slices);
  while (pattern.length < slices) pattern.push(1);
  return pattern.map((p, i) => (i % 2 === 0 ? -1 : 1) * p * intensity);
}

export type BayerOverlayOptions = {
  width: number;
  height: number;
  /** Gradient start % (0–100) where overlay is transparent (default 55) */
  gradientStartPercent?: number;
  /** Gradient end % (0–100) where overlay is fully visible (default 80) */
  gradientEndPercent?: number;
  /** Fill color of the checkerboard (default #f5ecd7) */
  fillColor?: string;
  /** Size of each checker in px; larger = more visible dither (default 4) */
  patternSize?: number;
};

export type DatabendEffectProps = {
  children: React.ReactNode;
  /** Number of horizontal bands to offset (default 4) */
  slices?: number;
  /** Max horizontal offset in px (default 2) */
  intensity?: number;
  /** Optional styles for the wrapper (e.g. fontSize, fontFamily). Applied to layout and each slice. */
  style?: React.CSSProperties;
  /** Wrapper element: 'span' (inline) or 'div' (default span) */
  as?: 'span' | 'div';
  /** Optional Bayer overlay: pass params and the checkerboard is rendered over this block. You can use multiple per image. */
  bayer?: BayerOverlayOptions;
};

/**
 * Wraps any content and applies the databend glitch (horizontal slice offsets).
 * Use around masthead text, numbers, or single words. Content is duplicated
 * into N slices with small left/right offsets and clipPaths.
 */
export function DatabendEffect({
  children,
  slices = 4,
  intensity = 2,
  style = {},
  as: Wrapper = 'span',
  bayer,
}: DatabendEffectProps): React.ReactElement {
  const offsets = getSliceOffsets(slices, intensity);
  const bayerUrl = bayer ? getBayerOverlayUrl(bayer) : undefined;
  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    ...style,
  };
  return (
    <Wrapper style={wrapperStyle}>
      <Wrapper style={{ ...style, visibility: 'hidden' }}>{children}</Wrapper>
      {offsets.map((left, i) => (
        <Wrapper
          key={i}
          style={{
            ...style,
            position: 'absolute',
            top: 0,
            left,
            clipPath: getSliceClipPath(slices, i),
          }}
        >
          {children}
        </Wrapper>
      ))}
      {bayerUrl && (
        <img
          src={bayerUrl}
          alt=""
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
      )}
    </Wrapper>
  );
}

export type DatabendWord =
  | { text: string; databend: false }
  | { text: string; databend: true; intensity?: number };

export type DatabendHeadlineOptions = {
  words: DatabendWord[];
  /** Number of horizontal bands to offset (default 4) */
  slices?: number;
  /** Max horizontal offset in px when intensity is not set per word (default 2) */
  defaultIntensity?: number;
  /** Optional Bayer overlay for the full line. Pass params (width/height to match the headline area). */
  bayer?: BayerOverlayOptions;
  /** Styles for the outer flex container (headline row) */
  containerStyle?: React.CSSProperties;
  /** Styles applied to the text (fontSize, fontFamily, etc.) */
  textStyle?: React.CSSProperties;
};

/**
 * Renders a headline where selected words use the databend effect. Optional
 * Bayer overlay img when you want the gradient checkerboard over the line.
 * Built from DatabendEffect for each word.
 */
export function DatabendHeadline({
  words,
  slices = 4,
  defaultIntensity = 2,
  bayer,
  containerStyle = {},
  textStyle = {},
}: DatabendHeadlineOptions): React.ReactElement {
  const baseStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    lineHeight: 1,
    ...containerStyle,
  };
  const bayerUrl = bayer ? getBayerOverlayUrl(bayer) : undefined;

  return (
    <div style={baseStyle}>
      {words.map((word, idx) => {
        if (!word.databend) {
          return (
            <span key={idx} style={textStyle}>
              {word.text}
            </span>
          );
        }
        return (
          <DatabendEffect
            key={idx}
            slices={slices}
            intensity={word.intensity ?? defaultIntensity}
            style={textStyle}
            as="span"
          >
            {word.text}
          </DatabendEffect>
        );
      })}
      {bayerUrl && (
        <img
          src={bayerUrl}
          alt=""
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
      )}
    </div>
  );
}

/**
 * Returns a data URL for a 2×2 Bayer (checkerboard) pattern masked by a
 * left-to-right linear gradient. Exported for custom use; normally pass
 * bayer params to DatabendEffect or DatabendHeadline.
 */
export function getBayerOverlayUrl({
  width,
  height,
  gradientStartPercent = 55,
  gradientEndPercent = 80,
  fillColor = '#f5ecd7',
  patternSize = 4,
}: BayerOverlayOptions): string {
  const s = patternSize;
  const bayerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><pattern id="b" x="0" y="0" width="${s * 2}" height="${s * 2}" patternUnits="userSpaceOnUse"><rect x="0" y="0" width="${s}" height="${s}" fill="${fillColor}"/><rect x="${s}" y="${s}" width="${s}" height="${s}" fill="${fillColor}"/></pattern><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="${gradientStartPercent}%" stop-color="black"/><stop offset="${gradientEndPercent}%" stop-color="white"/></linearGradient><mask id="m"><rect width="100%" height="100%" fill="url(#g)"/></mask></defs><rect width="100%" height="100%" fill="url(#b)" mask="url(#m)"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(bayerSvg).toString('base64')}`;
}
