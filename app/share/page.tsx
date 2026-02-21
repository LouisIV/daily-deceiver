import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newspaper-game.vercel.app";

type SharePageProps = {
  searchParams: Promise<{
    score?: string;
    total?: string;
    grade?: string;
    papers?: string;
  }>;
};

export async function generateMetadata({ searchParams }: SharePageProps): Promise<Metadata> {
  const { score = "0", total = "10", grade = "Final Verdict", papers } = await searchParams;
  const params = new URLSearchParams({ score, total, grade });
  if (papers) params.set("papers", papers);
  const imageUrl = `/api/og-share?${params.toString()}`;
  const shareUrl = `/share?${params.toString()}`;
  const title = `Score ${score}/${total} — ${grade}`;
  const description = "Play The Daily Deceiver and share your score.";

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      url: shareUrl,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "The Daily Deceiver score card",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SharePage({ searchParams }: SharePageProps) {
  const { score = "0", total = "10", grade = "Final Verdict" } = await searchParams;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 640,
          width: "100%",
          background: "var(--cream)",
          border: "3px double var(--ink)",
          padding: "28px 24px",
          textAlign: "center",
        }}
      >
        <div className="subhead" style={{ marginBottom: 10 }}>
          Shared Result
        </div>
        <div
          style={{
            fontFamily: "'UnifrakturMaguntia',cursive",
            fontSize: "clamp(52px,11vw,88px)",
            lineHeight: 1,
            color: "var(--ink)",
          }}
        >
          {score}
          <span style={{ fontSize: "0.4em", opacity: 0.35 }}>/{total}</span>
        </div>
        <div className="headline" style={{ fontSize: 16, letterSpacing: 2, marginTop: 8 }}>
          {grade}
        </div>
        <div
          className="clipping-body"
          style={{ fontStyle: "italic", opacity: 0.6, marginTop: 10, fontSize: 12 }}
        >
          The Daily Deceiver — a vintage newspaper clipping guessing game.
        </div>
        <a
          href="/"
          style={{
            marginTop: 16,
            display: "inline-block",
            border: "1px solid var(--ink)",
            padding: "8px 14px",
            textDecoration: "none",
            color: "inherit",
            fontFamily: "'Special Elite',serif",
            letterSpacing: 1,
            background: "var(--paper)",
          }}
        >
          Play the Game
        </a>
      </div>
    </main>
  );
}
