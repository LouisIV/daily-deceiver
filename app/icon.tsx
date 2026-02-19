import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

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

export default async function Icon() {
  const unifraktur = await loadGoogleFont("UnifrakturMaguntia", "D");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#111111",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "#f3e9d2",
            fontFamily: '"UnifrakturMaguntia"',
            fontSize: 50,
            lineHeight: 1,
            transform: "translateY(2px)",
          }}
        >
          D
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "UnifrakturMaguntia",
          data: unifraktur,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
