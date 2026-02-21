import Link from "next/link";

export default function TestLandingPage() {
  const tests = [
    {
      path: "/test/og-share",
      title: "OG Share",
      description: "Configure and generate OG share image",
    },
    {
      path: "/test/og-preview",
      title: "OG Preview",
      description: "Preview OG image in social media cards",
    },
    {
      path: "/test/paper",
      title: "Paper Texture",
      description: "Test newspaper paper texture variants",
    },
    {
      path: "/test/remove-borders",
      title: "Remove Borders",
      description: "Test border removal from newspaper scans",
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/" style={{ color: "var(--rule)", fontSize: 14, textDecoration: "underline" }}>
          ← Back to game
        </Link>
      </div>

      <h1 style={{ fontFamily: "var(--font-unifraktur), cursive", color: "var(--ink)", marginBottom: 8 }}>
        Test Pages
      </h1>
      <p style={{ color: "var(--rule)", marginBottom: 24, fontSize: 15 }}>
        Interactive test utilities for newspaper features:
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {tests.map((test) => (
          <Link
            key={test.path}
            href={test.path}
            style={{
              padding: "16px 20px",
              display: "block",
              background: "var(--cream)",
              border: "1px solid var(--aged)",
              borderRadius: 0,
              textDecoration: "none",
              color: "var(--ink)",
            }}
          >
            <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4, fontSize: 15 }}>
              {test.title}
            </div>
            <div style={{ fontSize: 13, color: "var(--rule)" }}>
              {test.description}
            </div>
          </Link>
        ))}
      </div>

     
    </div>
  );
}
