import { ImageResponse } from 'next/og';
import { paperTextureSvgString } from '../../../lib/paper-texture';
import { DatabendHeadline } from '../../../lib/og-databend';

export const runtime = 'nodejs';

async function loadGoogleFont(font: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(/src: url\((.+?)\) format\('(woff2|woff|opentype|truetype)'\)/);
  if (resource) {
    const response = await fetch(resource[1]);
    if (response.status === 200) {
      return await response.arrayBuffer();
    }
  }
  throw new Error(`failed to load font: ${font}`);
}

export async function GET(request: Request) {
  const displayText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,.?!\'"·-';
  const textureUrl = `data:image/svg+xml;base64,${Buffer.from(paperTextureSvgString()).toString('base64')}`;

  const headlineBayer = {
    width: 1120,
    height: 90,
    gradientStartPercent: 55,
    gradientEndPercent: 80,
  };

  const [playfairFont, playfairFont900, unifrakturFont, imfellFont, girassolFont] = await Promise.all([
    loadGoogleFont('Playfair+Display:wght@700', displayText),
    loadGoogleFont('Playfair+Display:wght@900', displayText),
    loadGoogleFont('UnifrakturMaguntia', displayText),
    loadGoogleFont('IM+Fell+English', displayText),
    loadGoogleFont('Girassol', displayText),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1c1008',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          boxSizing: 'border-box',
        }}
      >
        {/* Paper background */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            background: '#f5ecd7',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '"IM Fell English", serif',
            padding: '24px 40px 32px 40px',
            boxSizing: 'border-box',
            color: '#1c1008',
            border: '5px solid #2a1a08',
          }}
        >
          {/* Paper texture overlay */}
          <img
            src={textureUrl}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0.18,
              mixBlendMode: 'multiply',
            }}
          />

          {/* Meta row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              letterSpacing: '0.5px',
              marginBottom: '10px',
              opacity: 0.85,
            }}
          >
            <span>NEW YORK • EVENING</span>
            <span>PRICE 1¢</span>
          </div>

          {/* Masthead */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: '10px',
              paddingBottom: '8px',
              borderBottom: '2px solid #2a1a08',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: '82px',
                fontFamily: '"UnifrakturMaguntia", serif',
                fontWeight: 400,
                margin: '0 0 4px 0',
                letterSpacing: '1px',
                lineHeight: 1,
                justifySelf: "center"
              }}
            >
              The Daily Deceiver
            </div>
            <div
              style={{
                fontSize: '18px',
                letterSpacing: '2px',
                opacity: 0.75,
              }}
            >
              A TRIVIA GAME OF FACTS & FABRICATIONS
            </div>
          </div>

          <DatabendHeadline
            words={[
              { text: 'CAN', databend: false },
              { text: 'YOU', databend: false },
              { text: 'SPOT', databend: false },
              { text: 'THE', databend: true, intensity: 1.5 },
              { text: 'FAKES?', databend: true, intensity: 3 },
            ]}
            bayer={headlineBayer}
            containerStyle={{ width: '100%' }}
            textStyle={{
              fontSize: '76px',
              fontFamily: '"Girassol", serif',
              fontWeight: 400,
              letterSpacing: '-1px',
            }}
          />

          {/* Double rule + subheadline */}
          <div style={{ borderTop: '3px solid #2a1a08', marginTop: '5px' }} />
          <div style={{ borderTop: '1px solid #2a1a08', marginTop: '3px' }} />
          <div
            style={{
              fontSize: '16px',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '5px 0 6px',
              borderBottom: '2px solid #2a1a08',
              fontFamily: '"IM Fell English", serif',
              letterSpacing: '0.3px',
            }}
          >
            Real 19th-Century Clippings Meet Clever AI Forgeries
          </div>

          {/* Columns */}
          <div style={{ display: 'flex', flex: 1, marginTop: '10px', overflow: 'hidden' }}>

            {/* Left column */}
            <div
              style={{
                width: '28%',
                paddingRight: '14px',
                borderRight: '1px solid #2a1a08',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: '8px', letterSpacing: '2px', marginBottom: '5px', opacity: 0.55 }}>
                VOICE FROM THE ARCHIVES
              </div>
              <div
                style={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                  fontSize: '14px',
                  lineHeight: 1.25,
                  marginBottom: '6px',
                  paddingBottom: '5px',
                  borderBottom: '1px solid #2a1a08',
                }}
              >
                Can You Hear the Presses Roll?
              </div>
              <div style={{ fontSize: '11px', lineHeight: 1.55, fontFamily: '"IM Fell English", serif' }}>
                The citizen who takes up this journal will find within its pages a curious amusement devised to test the wits of even the most discerning reader. Our editors have gathered genuine clippings from the previous century and set them alongside fabrications of considerable craft. The reader is invited to distinguish truth from invention, and is warned the task is rather more difficult than it may at first appear.
              </div>
            </div>

            {/* Center column — photo block */}
            <div
              style={{
                width: '44%',
                paddingLeft: '14px',
                paddingRight: '14px',
                borderRight: '1px solid #2a1a08',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: 'linear-gradient(160deg, #2a1a08 0%, #3d2610 45%, #2a1a08 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #1c1008',
                  marginBottom: '7px',
                }}
              >
                <img
                  src="https://cdn.loc.gov/service/pnp/ppmsca/31600/31678v.jpg"
                  alt="World's Columbian Exposition, 1893"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div
                style={{
                  fontSize: '10px',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  opacity: 0.55,
                  fontFamily: '"IM Fell English", serif',
                  lineHeight: 1.4,
                }}
              >
                Archival illustration from the Library of Congress collection, circa 1893.
              </div>
            </div>

            {/* Right column */}
            <div
              style={{
                width: '28%',
                paddingLeft: '14px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: '8px', letterSpacing: '2px', marginBottom: '5px', opacity: 0.55 }}>
                A POWDERY SURFACE FOUND
              </div>
              <div
                style={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                  fontSize: '14px',
                  lineHeight: 1.25,
                  marginBottom: '6px',
                  paddingBottom: '5px',
                  borderBottom: '1px solid #2a1a08',
                }}
              >
                Deception Found in Every Column
              </div>
              <div style={{ fontSize: '11px', lineHeight: 1.55, fontFamily: '"IM Fell English", serif' }}>
                The game proceeds thus: each clipping is presented in turn, and the player must declare whether the article is genuine or the product of artifice. Points are awarded for correct identification. The editors offer no guarantee of easy passage, as the forgeries have been composed with considerable period authenticity and no small measure of wit.
              </div>
            </div>

          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Playfair Display',
          data: playfairFont,
          weight: 700,
          style: 'normal',
        },
        {
          name: 'Playfair Display',
          data: playfairFont900,
          weight: 900,
          style: 'normal',
        },
        {
          name: 'UnifrakturMaguntia',
          data: unifrakturFont,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'IM Fell English',
          data: imfellFont,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Girassol',
          data: girassolFont,
          weight: 400,
          style: 'normal',
        },
      ],
    }
  );
}
