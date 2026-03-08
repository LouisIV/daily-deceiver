import Link from "next/link";

export default function AboutPage() {
  return (
    <main
      className="clipping-body"
      style={{ maxWidth: "640px", margin: "0 auto", padding: "2rem" }}
    >
      <Link
        href="/"
        style={{
          color: "var(--ink)",
          textDecoration: "underline",
          fontSize: "0.875rem",
          display: "inline-block",
          marginBottom: "1rem",
        }}
      >
        ← Back to game
      </Link>

      <h1
        className="headline"
        style={{
          marginBottom: "1.5rem",
          fontFamily: "var(--font-unifraktur), cursive",
          textTransform: "none !important",
        }}
      >
        About The Daily Deceiver
      </h1>

      <p className="drop-cap">
        Step into the archives and test your ability to separate fact from
        fiction in vintage journalism.
      </p>

      <h2
        className="headline"
        style={{
          fontSize: "1.5rem",
          marginTop: "1.5rem",
          marginBottom: "0.5rem",
        }}
      >
        How to Play
      </h2>
      <ul style={{ marginLeft: "1.5rem", marginBottom: "1rem" }}>
        <li>
          Each day, you'll be presented with newspaper clippings from the 1800s
        </li>
        <li>
          Your mission: guess whether each headline is <strong>Real</strong> or{" "}
          <strong>Fake</strong>
        </li>
        <li>Score points for correct guesses and climb the leaderboard</li>
        <li>Share your results and challenge friends</li>
      </ul>

      <h2
        className="headline"
        style={{
          fontSize: "1.5rem",
          marginTop: "1.5rem",
          marginBottom: "0.5rem",
        }}
      >
        The Real Headlines
      </h2>
      <p>
        Every real headline you see comes from the{" "}
        <strong>Library of Congress</strong>'s incredible{" "}
        <a
          href="https://chroniclingamerica.loc.gov"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--ink)", textDecoration: "underline" }}
        >
          Chronicling America
        </a>{" "}
        collection—an ongoing effort to digitize and preserve America's historic
        newspapers.
      </p>
      <p style={{ marginTop: "0.75rem" }}>
        Chronicling America is a partnership between the{" "}
        <strong>Library of Congress</strong> and the{" "}
        <strong>National Endowment for the Humanities (NEH)</strong>, with
        contributions from state partners across the country. The project is
        part of the <strong>National Digital Newspaper Program (NDNP)</strong>,
        which has been working since 2005 to create a searchable digital archive
        of newspapers published in the United States from 1756 to 1963.
      </p>
      <p style={{ marginTop: "0.75rem" }}>
        Today, the collection contains <strong>millions of pages</strong> from
        newspapers in every state—from small-town weeklies to major city
        dailies. It's one of the largest freely accessible historical newspaper
        databases in the world, and it's an invaluable resource for historians,
        genealogists, researchers, and anyone curious about America's past.
      </p>
      <p style={{ marginTop: "0.75rem" }}>
        <strong>Public Domain:</strong> All 19th-century newspapers in the
        collection are in the public domain. Under US copyright law, works
        published before 1928 have entered the public domain (95 years from
        publication), making these historical headlines free to use and share.
      </p>
      <p style={{ marginTop: "0.75rem" }}>
        This game would not exist without their work. We're deeply grateful to
        the Library of Congress, NEH, and all the state partners who have made
        this preservation possible.
      </p>

      <h2
        className="headline"
        style={{
          fontSize: "1.5rem",
          marginTop: "1.5rem",
          marginBottom: "0.5rem",
        }}
      >
        The Fake Headlines
      </h2>
      <p>
        The fictional headlines are invented—but inspired by the wild stories
        that circulated in the era of yellow journalism. The 1800s were full of
        sensationalism, hoaxes, and outlandish claims. We've tried to capture
        that spirit.
      </p>

      <h2
        className="headline"
        style={{
          fontSize: "1.5rem",
          marginTop: "1.5rem",
          marginBottom: "0.5rem",
        }}
      >
        Credits
      </h2>
      <ul style={{ marginLeft: "1.5rem", marginBottom: "1rem" }}>
        <li>
          <strong>Newspaper Archives:</strong>{" "}
          <a
            href="https://www.loc.gov"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--ink)" }}
          >
            Library of Congress
          </a>{" "}
          ·{" "}
          <a
            href="https://chroniclingamerica.loc.gov"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--ink)" }}
          >
            Chronicling America
          </a>
        </li>
        <li>
          <strong>Game Concept & Design:</strong> Louis J Lombardo IV
        </li>
      </ul>
    </main>
  );
}
