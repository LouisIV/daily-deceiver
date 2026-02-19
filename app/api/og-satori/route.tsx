import satori from 'satori';
import sharp from 'sharp';

export const runtime = 'nodejs';

async function getSfonts() {
  const playfairUrl = 'https://fonts.gstatic.com/s/playfairdisplay/v36/nuFvD-vgj4E1x6YV6-H00xBMvM3Kj_hJIl7OPOdw7qY.woff2';
  const playfairRes = await fetch(playfairUrl);
  const playfairBuffer = await playfairRes.arrayBuffer();

  return [
    {
      name: 'Playfair Display',
      data: playfairBuffer,
      weight: 900 as const,
      style: 'normal' as const,
    },
  ];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const headline = searchParams.get('headline') || 'Is It Real or Fake?';
  const subtitle = searchParams.get('subtitle') || 'A 19th-Century Newspaper Trivia Game';

  const fonts = await getSfonts();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svg = await satori(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#f5ecd7',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Playfair Display, serif',
        padding: '40px',
        position: 'relative',
      }}
    >
      {/* Border */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: '12px solid #1c1008',
          boxSizing: 'border-box',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          textAlign: 'center',
        }}
      >
        {/* Ornaments */}
        <div
          style={{
            fontSize: '28px',
            color: '#1c1008',
            marginBottom: '16px',
            letterSpacing: '3px',
          }}
        >
          ❖ ❖ ❖
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: '72px',
            fontWeight: 900,
            color: '#1c1008',
            margin: '0 0 20px 0',
            letterSpacing: '2px',
            lineHeight: '1.2',
            maxWidth: '1000px',
          }}
        >
          {headline}
        </h1>

        {/* Rule */}
        <div
          style={{
            width: '400px',
            height: '3px',
            background: '#1c1008',
            margin: '24px 0 20px 0',
          }}
        />

        {/* Subtitle */}
        <p
          style={{
            fontSize: '32px',
            color: '#1c1008',
            margin: '0',
            fontStyle: 'italic',
            opacity: 0.8,
          }}
        >
          {subtitle}
        </p>

        {/* Lower ornament */}
        <div
          style={{
            fontSize: '20px',
            color: '#1c1008',
            marginTop: '24px',
            opacity: 0.6,
          }}
        >
          ✦
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts,
    }
  ) as string;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, immutable, no-transform, max-age=31536000',
    },
  });
}
