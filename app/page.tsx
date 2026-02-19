"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";

/* ─── Claude API ────────────────────────────────────────────────────────────── */
type ClaudeMessage = {
  role: string;
  content: string;
  [key: string]: unknown;
};

type ClaudeTool = {
  type: string;
  name?: string;
  [key: string]: unknown;
};

type ClaudeOptions = {
  system?: string;
  messages?: ClaudeMessage[];
  tools?: ClaudeTool[];
  maxTokens?: number;
};

async function callClaude({ system, messages, tools, maxTokens = 1200 }: ClaudeOptions): Promise<string> {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages, tools, maxTokens }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`API error ${res.status}: ${msg}`);
  }

  const data = (await res.json()) as { text?: string };
  return data.text || "";
}

/* ─── Data fetching ─────────────────────────────────────────────────────────── */
const SEARCH_QUERIES = [
  "lost horse reward 1890",
  "runaway wagon 1895",
  "county fair 1900",
  "fire destroyed building 1888",
  "railroad accident 1892",
  "church social ladies 1898",
  "peculiar circumstance 1885",
  "harvest wheat 1903",
  "town council meeting 1896",
  "marriage ceremony 1901",
];

type Snippet = {
  headline: string;
  text: string;
  source?: string;
  url?: string;
  real: boolean;
};

const LAYOUTS = ["broadside", "column", "notice", "feature", "classified"] as const;
type LayoutType = (typeof LAYOUTS)[number];

type Round = Snippet & { layout: LayoutType };

type Answered = null | "correct" | "wrong";
type Phase = "loading" | "playing" | "over";

type HistoryItem = {
  snippet: Round;
  guessReal: boolean;
  correct: boolean;
};

type CaItem = {
  title?: string;
  date?: string;
  ocr_eng?: string;
  ocr?: string;
  url?: string;
};

const MIN_SNIPPET_WORDS = 40;
const MAX_SNIPPET_WORDS = 120;

function words(text: string): string[] {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

function excerptFromOcr(raw: string): string | null {
  const cleaned = raw
    .replace(/\[[^\]]*]/g, " ")
    .replace(/[|_~`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const w = words(cleaned);
  if (w.length < MIN_SNIPPET_WORDS) return null;
  if (w.length <= MAX_SNIPPET_WORDS) return w.join(" ");
  return w.slice(0, MAX_SNIPPET_WORDS).join(" ");
}

function headlineFromItem(item: CaItem, text: string): string {
  const title = (item.title || "").replace(/\s+/g, " ").trim();
  if (title) return title.split(" ").slice(0, 8).join(" ").toUpperCase();
  return text.split(" ").slice(0, 6).join(" ").toUpperCase();
}

async function fetchRealSnippetsFromCA(
  count: number,
  queries: string[],
  onProgress?: (msg: string) => void
): Promise<Snippet[]> {
  const snippets: Snippet[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    if (snippets.length >= count) break;
    onProgress?.(`Searching the archives: "${query}"…`);

    const searchUrl =
      "https://chroniclingamerica.loc.gov/search/pages/results/?" +
      new URLSearchParams({
        andtext: query,
        dateFilterType: "yearRange",
        date1: "1875",
        date2: "1920",
        rows: "20",
        format: "json",
      }).toString();

    let items: CaItem[] = [];
    try {
      const res = await fetch(searchUrl);
      if (!res.ok) continue;
      const data = (await res.json()) as { items?: CaItem[] };
      items = Array.isArray(data.items) ? data.items : [];
    } catch {
      continue;
    }

    for (const item of items) {
      if (snippets.length >= count) break;
      const ocrUrl =
        item.ocr_eng ||
        item.ocr ||
        (item.url ? `${item.url.replace(/\/$/, "")}/ocr.txt` : null);
      if (!ocrUrl) continue;

      try {
        const textRes = await fetch(ocrUrl);
        if (!textRes.ok) continue;
        const raw = await textRes.text();
        const excerpt = excerptFromOcr(raw);
        if (!excerpt) continue;

        const dedupeKey = `${item.title || ""}::${excerpt.slice(0, 90)}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        snippets.push({
          headline: headlineFromItem(item, excerpt),
          text: excerpt,
          source:
            [item.title, item.date].filter(Boolean).join(", ") ||
            "Chronicling America / Library of Congress",
          real: true,
        });
      } catch {
        continue;
      }
    }
  }

  return snippets;
}

async function fetchRealSnippets(
  count = 5,
  onProgress?: (msg: string) => void
): Promise<Snippet[]> {
  const queries = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);
  onProgress?.("Searching the Library of Congress archives…");

  try {
    const direct = await fetchRealSnippetsFromCA(count, queries, onProgress);
    if (direct.length > 0) return direct.slice(0, count);

    const fallback = await fetch("/api/loc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count, queries }),
    });
    if (!fallback.ok) return [];
    const data = (await fallback.json()) as {
      snippets?: Array<{ headline?: string; text?: string; source?: string }>;
    };
    return (data.snippets || []).slice(0, count).map((s) => ({
      headline: s.headline?.trim() || "FROM OUR CORRESPONDENT",
      text: (s.text || "").trim(),
      source: s.source?.trim() || "Chronicling America / Library of Congress",
      real: true,
    })).filter((s) => s.text.length >= 40);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("fetch real:", message);
    return [];
  }
}

async function generateFakeSnippets(
  count = 5,
  onProgress?: (msg: string) => void
): Promise<Snippet[]> {
  onProgress?.("Typesetting convincing forgeries…");
  try {
    const text = await callClaude({
      system: `Generate fake 19th-century American small-town newspaper snippets for a trivia game.
Each needs a short punchy headline (4-8 words ALL CAPS) and body text (40-120 words).
Sound authentically period-appropriate (1875-1920), plausible but subtly amusing.
Vary types: notices, news items, social columns, want ads, editorial comments.
Return ONLY raw JSON array, no markdown:
[{"headline":"HEADLINE HERE","text":"body here"}, ...]`,
      messages: [
        {
          role: "user",
          content: `Generate ${count} fake 19th-century American newspaper snippets as a JSON array of objects with headline and text fields.`,
        },
      ],
      maxTokens: 1400,
    });

    const m = text.match(/\[[\s\S]*\]/);
    if (!m) throw new Error("no JSON");
    const parsed = JSON.parse(m[0]) as Array<{ headline?: string; text?: string }>;
    return parsed.slice(0, count).map((o) => ({
      headline: o.headline || "NOTICE TO THE PUBLIC",
      text: String(o.text),
      real: false,
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("fake gen:", message);
    return FALLBACK_FAKES.slice(0, count);
  }
}

const FALLBACK_FAKES: Snippet[] = [
  {
    headline: "MULE OF UNCERTAIN TEMPERAMENT REPORTED MISSING",
    text: "LOST—One brown mule of considerable age and uncertain disposition, last seen near the Harmon mill road Tuesday evening. The animal answers to no name in particular. A reward of two dollars will be paid to any person returning said mule, provided they do so before the subscriber's patience is entirely exhausted. Apply to H.W. Dearing, east of the square.",
    real: false,
  },
  {
    headline: "TEMPERANCE SOCIETY MEETING YIELDS MIXED RESULTS",
    text: "The Temperance Society met Thursday last in the upper room of the Odd Fellows Hall. After considerable debate on the corrupting influence of spirits upon the farming community, refreshments were served. Three members were found to be in violation of the society's founding principles and were invited not to return.",
    real: false,
  },
  {
    headline: "LOCAL CITIZEN'S HAT OCCASIONS CONSIDERABLE COMMENT",
    text: "We are informed that Mr. Cassius Plumb, heretofore considered among our most reliable citizens, has taken to wearing a hat of Eastern manufacture which has occasioned no small degree of comment along Main Street. Mr. Plumb declined to explain himself when approached by this reporter.",
    real: false,
  },
  {
    headline: "COUNCIL ADJOURNS WITHOUT DECISION ON COURTHOUSE PAINT",
    text: "The question of whether to repaint the exterior of the county courthouse was debated at considerable length during Monday's council session. Alderman Briggs favored a dignified grey. Alderman Wentworth held out for cream. No vote was taken. The meeting adjourned when the lamp oil ran low.",
    real: false,
  },
  {
    headline: "CAUTION ISSUED REGARDING TRAVELING LAND SURVEYOR",
    text: "CAUTION TO THE PUBLIC. We are given to understand that a man presenting himself as a licensed land surveyor has been working the roads between here and Primghar. Persons who have employed his services report his measurements to be creative rather than accurate. Caveat emptor, as the Romans wisely cautioned.",
    real: false,
  },
];

/* ─── Layout variants for clipping cards ───────────────────────────────────── */
// Each snippet gets one of several authentic newspaper layout styles
function getLayout(index: number): LayoutType {
  return LAYOUTS[index % LAYOUTS.length];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TOTAL = 10;

/* ─── Main App ──────────────────────────────────────────────────────────────── */
export default function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [progress, setProgress] = useState<string>("Setting the type…");
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [answered, setAnswered] = useState<Answered>(null); // null | "correct" | "wrong"
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const initRan = useRef(false);

  const loadGame = useCallback(async (): Promise<void> => {
    setPhase("loading");
    setError(null);
    setProgress("Setting the type…");
    try {
      // Try pre-generated daily game from Vercel Blob if URL is configured
      let combined: Snippet[] | null = null;
      const dailyGameUrl = process.env.NEXT_PUBLIC_DAILY_GAME_URL;
      if (dailyGameUrl) {
        try {
          setProgress("Fetching today's edition…");
          const res = await fetch(dailyGameUrl);
          if (res.ok) {
            const daily = (await res.json()) as { snippets?: Snippet[] };
            if (Array.isArray(daily.snippets) && daily.snippets.length >= 6) {
              combined = daily.snippets;
            }
          }
        } catch { /* fall through to live generation */ }
      }

      // Fall back to live generation
      if (!combined) {
        const [reals, fakes] = await Promise.all([
          fetchRealSnippets(5, setProgress),
          generateFakeSnippets(5, setProgress),
        ]);
        combined = [...reals, ...fakes];
        while (combined.filter((r) => !r.real).length < 3) {
          combined.push(FALLBACK_FAKES[combined.length % FALLBACK_FAKES.length]);
        }
      }

      setRounds(
        shuffle(combined)
          .slice(0, TOTAL)
          .map((r, i) => ({ ...r, layout: getLayout(i) }))
      );
      setCurrent(0);
      setScore(0);
      setAnswered(null);
      setHistory([]);
      setPhase("playing");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    }
  }, []);

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    loadGame();
  }, [loadGame]);

  const snippet = rounds[current];

  const guess = useCallback(
    (isReal: boolean) => {
      if (answered || !snippet) return;
      const ok = isReal === snippet.real;
      setAnswered(ok ? "correct" : "wrong");
      if (ok) setScore((s) => s + 1);
      setHistory((h) => [...h, { snippet, guessReal: isReal, correct: ok }]);
    },
    [answered, snippet]
  );

  const next = useCallback(() => {
    if (current + 1 >= rounds.length) setPhase("over");
    else {
      setCurrent((c) => c + 1);
      setAnswered(null);
    }
  }, [current, rounds.length]);

  useEffect(() => {
    if (phase !== "playing") return;
    const fn = (e: KeyboardEvent) => {
      if (!answered) {
        if (e.key === "r" || e.key === "R") guess(true);
        if (e.key === "f" || e.key === "F") guess(false);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [phase, answered, guess, next]);

  const grade = (): [string, string] => {
    if (score >= 9)
      return [
        "EDITOR-IN-CHIEF",
        "You could smell the ink from a mile away.",
      ];
    if (score >= 7)
      return [
        "SEASONED CORRESPONDENT",
        "A discerning reader of considerable merit.",
      ];
    if (score >= 5)
      return ["CASUAL SUBSCRIBER", "You got your nickel's worth, at least."];
    if (score >= 3)
      return ["OCCASIONAL READER", "Perhaps stick to the weather column."];
    return ["HOPELESSLY DECEIVED", "We suggest canceling your subscription."];
  };

  return (
    <div
      className="paper-texture"
      style={{ minHeight: "100vh", background: "var(--paper)" }}
    >
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 16px 80px" }}>
        <Masthead
          score={score}
          current={current}
          phase={phase}
          total={rounds.length}
        />

        {phase === "loading" && (
          <LoadScreen progress={progress} error={error} retry={loadGame} />
        )}
        {phase === "playing" && snippet && (
          <PlayScreen
            snippet={snippet}
            current={current}
            total={rounds.length}
            answered={answered}
            score={score}
            guess={guess}
            next={next}
          />
        )}
        {phase === "over" && (
          <ResultScreen
            score={score}
            total={rounds.length}
            grade={grade()}
            history={history}
            restart={loadGame}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Masthead ──────────────────────────────────────────────────────────────── */
function Masthead({
  score,
  current,
  phase,
  total,
}: {
  score: number;
  current: number;
  phase: Phase;
  total: number;
}) {
  return (
    <header style={{ paddingTop: 24, paddingBottom: 0, textAlign: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <hr className="rule-thick" style={{ flex: 1 }} />
        <span className="ornament" style={{ fontSize: 18 }}>
          ✦ ✦ ✦
        </span>
        <hr className="rule-thick" style={{ flex: 1 }} />
      </div>

      <div className="subhead" style={{ marginBottom: 4 }}>
        Est. MDCCCLXXXI · Cherokee County, Iowa · Library of Congress Collection
      </div>

      <h1 className="masthead-title">The Daily Deceiver</h1>

      <div className="subhead" style={{ marginTop: 4, fontSize: 10 }}>
        "All The News That's Fit To Question" · One Cent Per Copy
      </div>

      <hr className="rule-thin" style={{ marginTop: 6 }} />
      <hr className="rule-thick" style={{ marginTop: 2, marginBottom: 6 }} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span className="subhead" style={{ fontSize: 9 }}>
          Real: Chronicling America / LOC
        </span>
        {phase === "playing" && (
          <span
            style={{
              fontFamily: "'Playfair Display',serif",
              fontWeight: 700,
              fontSize: 13,
              color: "var(--ink)",
            }}
          >
            Score: {score} / {current}
          </span>
        )}
        <span className="subhead" style={{ fontSize: 9 }}>
          Fake: Claude AI
        </span>
      </div>

      <hr className="rule-double" style={{ marginBottom: 20 }} />
    </header>
  );
}

/* ─── Loading Screen ────────────────────────────────────────────────────────── */
function LoadScreen({
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

/* ─── Play Screen ───────────────────────────────────────────────────────────── */
function PlayScreen({
  snippet,
  current,
  total,
  answered,
  score,
  guess,
  next,
}: {
  snippet: Round;
  current: number;
  total: number;
  answered: Answered;
  score: number;
  guess: (isReal: boolean) => void;
  next: () => void;
}) {
  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          justifyContent: "center",
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i === current ? 20 : 8,
              height: 8,
              borderRadius: 4,
              background:
                i < current
                  ? "var(--ink)"
                  : i === current
                  ? "#c4972a"
                  : "var(--aged)",
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>

      <Clipping
        snippet={snippet}
        layout={snippet.layout}
        answered={answered}
        index={current}
      />

      {answered && (
        <div
          style={{
            textAlign: "center",
            margin: "20px 0",
            animation: "stampIn 0.4s cubic-bezier(.2,.8,.3,1)",
          }}
        >
          <div
            style={{
              display: "inline-block",
              border: `4px solid ${
                answered === "correct" ? "var(--green)" : "var(--red)"
              }`,
              padding: "10px 28px",
              transform: answered === "correct" ? "rotate(-2deg)" : "rotate(2deg)",
              background: "var(--cream)",
            }}
          >
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontWeight: 900,
                fontSize: "clamp(20px,4vw,30px)",
                letterSpacing: 4,
                textTransform: "uppercase",
                color: answered === "correct" ? "var(--green)" : "var(--red)",
              }}
            >
              {answered === "correct" ? "✓ Verified" : "✗ Deceived"}
            </div>
            <div
              className="clipping-body"
              style={{
                fontSize: 12,
                fontStyle: "italic",
                opacity: 0.75,
                marginTop: 4,
                textAlign: "center",
              }}
            >
              {snippet.real
                ? `Genuine clipping · ${snippet.source}`
                : "AI fabrication · No such edition exists"}
            </div>
          </div>
        </div>
      )}

      {!answered ? (
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            marginTop: 24,
            flexWrap: "wrap",
          }}
        >
          <NewsButton
            onClick={() => guess(true)}
            label="Real"
            emoji="📰"
            hint="R"
            color="var(--green)"
          />
          <NewsButton
            onClick={() => guess(false)}
            label="Fake"
            emoji="🎭"
            hint="F"
            color="var(--red)"
          />
        </div>
      ) : (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <StampButton onClick={next} color="var(--ink)">
            {current + 1 >= total ? "See Final Results →" : "Next Clipping →"}
            <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 8 }}>
              [Enter]
            </span>
          </StampButton>
        </div>
      )}
    </div>
  );
}

/* ─── Clipping Card — multiple layout variants ──────────────────────────────── */
function Clipping({
  snippet,
  layout,
  answered,
  index,
}: {
  snippet: Round;
  layout: LayoutType;
  answered: Answered;
  index: number;
}) {
  const rot = [-0.6, 0.5, -0.4, 0.7, -0.3, 0.4][index % 6];

  const cardStyle = {
    background: "var(--cream)",
    border: "1px solid #c8b080",
    boxShadow: "2px 3px 0 #bfa870, 4px 7px 22px rgba(0,0,0,0.14)",
    padding: "28px 32px",
    marginBottom: 8,
    transform: `rotate(${rot}deg)`,
    transition: "transform 0.4s cubic-bezier(.2,.8,.4,1)",
    position: "relative" as const,
    overflow: "hidden" as const,
  };

  const stain = (
    <div
      style={{
        position: "absolute",
        top: -30,
        right: -20,
        width: 120,
        height: 120,
        borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(180,140,60,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }}
    />
  );

  if (layout === "broadside")
    return (
      <div style={cardStyle}>
        {stain}
        <hr className="rule-thick" />
        <hr className="rule-thin" style={{ marginTop: 2, marginBottom: 10 }} />

        <div
          className="headline"
          style={{
            fontSize: "clamp(18px,3.5vw,26px)",
            textAlign: "center",
            marginBottom: 6,
          }}
        >
          {snippet.headline}
        </div>

        <hr className="rule-thin" style={{ marginBottom: 10 }} />

        <p className="clipping-body drop-cap">{snippet.text}</p>

        <hr className="rule-thin" style={{ marginTop: 12 }} />
        <hr className="rule-thick" style={{ marginTop: 2 }} />
      </div>
    );

  if (layout === "column")
    return (
      <div style={cardStyle}>
        {stain}
        <div style={{ display: "flex", gap: 20 }}>
          <div
            style={{
              width: 90,
              flexShrink: 0,
              borderRight: "1px solid var(--ink)",
              paddingRight: 16,
              paddingTop: 4,
            }}
          >
            <div
              className="subhead"
              style={{ fontSize: 9, marginBottom: 8, lineHeight: 1.4 }}
            >
              FROM OUR
              <br />
              CORRESPONDENT
            </div>
            <div className="ornament" style={{ fontSize: 22, textAlign: "center" }}>
              ❧
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              className="headline"
              style={{ fontSize: "clamp(15px,2.8vw,20px)", marginBottom: 8 }}
            >
              {snippet.headline}
            </div>
            <hr className="rule-thin" style={{ marginBottom: 8 }} />
            <p className="clipping-body">{snippet.text}</p>
          </div>
        </div>
      </div>
    );

  if (layout === "notice")
    return (
      <div style={{ ...cardStyle, textAlign: "center" }}>
        {stain}
        <div
          className="ornament"
          style={{ fontSize: 20, marginBottom: 6, letterSpacing: 8 }}
        >
          — ✦ —
        </div>

        <div className="subhead" style={{ marginBottom: 6 }}>
          Notice
        </div>
        <hr className="rule-thick" style={{ width: 60, margin: "0 auto 10px" }} />

        <div
          className="headline"
          style={{ fontSize: "clamp(16px,3vw,22px)", marginBottom: 10 }}
        >
          {snippet.headline}
        </div>

        <p
          className="clipping-body"
          style={{ textAlign: "center", maxWidth: 480, margin: "0 auto" }}
        >
          {snippet.text}
        </p>

        <div
          className="ornament"
          style={{ fontSize: 20, marginTop: 10, letterSpacing: 8 }}
        >
          — ✦ —
        </div>
      </div>
    );

  if (layout === "feature")
    return (
      <div style={cardStyle}>
        {stain}
        <hr className="rule-thick" />

        <div
          style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "8px 0" }}
        >
          <div
            className="headline"
            style={{
              fontSize: "clamp(20px,4vw,32px)",
              flex: 1,
              lineHeight: 1,
            }}
          >
            {snippet.headline}
          </div>
          <div className="ornament" style={{ fontSize: 28, flexShrink: 0 }}>
            ❦
          </div>
        </div>

        <hr className="rule-thin" style={{ marginBottom: 10 }} />

        <div
          style={{
            columnCount: 2,
            columnGap: 20,
            columnRule: "1px solid var(--ink)",
          }}
        >
          <p className="clipping-body drop-cap">{snippet.text}</p>
        </div>
      </div>
    );

  return (
    <div style={{ ...cardStyle, borderLeft: "4px solid var(--ink)" }}>
      {stain}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flexShrink: 0, width: 32, textAlign: "center" }}>
          <div className="ornament" style={{ fontSize: 24 }}>
            ☞
          </div>
        </div>
        <div>
          <div
            className="headline"
            style={{ fontSize: "clamp(13px,2.3vw,17px)", marginBottom: 6 }}
          >
            {snippet.headline}
          </div>
          <p className="clipping-body" style={{ fontSize: "clamp(12px,1.9vw,15px)" }}>
            {snippet.text}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Results Screen ────────────────────────────────────────────────────────── */
function ResultScreen({
  score,
  total,
  grade: [title, sub],
  history,
  restart,
}: {
  score: number;
  total: number;
  grade: [string, string];
  history: HistoryItem[];
  restart: () => void | Promise<void>;
}) {
  return (
    <div style={{ animation: "fadeUp 0.5s ease" }}>
      <div
        style={{
          border: "3px double var(--ink)",
          padding: "32px 24px",
          marginBottom: 24,
          background: "var(--cream)",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div className="subhead" style={{ marginBottom: 10 }}>
          Final Verdict
        </div>
        <hr className="rule-thin" style={{ marginBottom: 12 }} />

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

        <hr className="rule-thin" style={{ margin: "12px 0 8px" }} />

        <div
          className="headline"
          style={{ fontSize: "clamp(14px,3vw,20px)", letterSpacing: 3 }}
        >
          {title}
        </div>
        <div
          className="clipping-body"
          style={{ fontStyle: "italic", opacity: 0.65, marginTop: 6, fontSize: 14 }}
        >
          "{sub}"
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div className="subhead" style={{ marginBottom: 8 }}>
          Your Record
        </div>
        <hr className="rule-thick" style={{ marginBottom: 10 }} />
        {history.map((h, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              padding: "8px 0",
              borderBottom: "1px solid var(--aged)",
              alignItems: "flex-start",
            }}
          >
            <span
              style={{
                fontFamily: "'Playfair Display',serif",
                fontWeight: 900,
                fontSize: 16,
                flexShrink: 0,
                color: h.correct ? "var(--green)" : "var(--red)",
              }}
            >
              {h.correct ? "✓" : "✗"}
            </span>
            <div style={{ flex: 1 }}>
              <div
                className="headline"
                style={{ fontSize: 11, marginBottom: 2, opacity: 0.8 }}
              >
                {h.snippet.headline}
              </div>
              <div
                className="clipping-body"
                style={{ fontSize: 11, opacity: 0.65, lineHeight: 1.4 }}
              >
                {h.snippet.text.slice(0, 100)}…
              </div>
              <div className="subhead" style={{ fontSize: 9, marginTop: 3 }}>
                {h.snippet.real
                  ? `Real · ${h.snippet.source}`
                  : "AI-Generated Fake"} · You guessed: {h.guessReal ? "Real" : "Fake"}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center" }}>
        <StampButton onClick={restart} color="var(--ink)">
          🗞 Print Another Edition
        </StampButton>
        <div
          className="clipping-body"
          style={{ fontStyle: "italic", fontSize: 10, opacity: 0.35, marginTop: 10 }}
        >
          Each new game fetches fresh real clippings from the Library of Congress
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable UI pieces ────────────────────────────────────────────────────── */
function NewsButton({
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

function StampButton({
  onClick,
  color,
  children,
}: {
  onClick: () => void | Promise<void>;
  color: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: color,
        color: "var(--cream)",
        border: "none",
        padding: "12px 36px",
        fontFamily: "'Playfair Display SC',Georgia,serif",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: 3,
        textTransform: "uppercase",
        boxShadow: "3px 4px 0 rgba(0,0,0,0.35)",
        transition: "filter 0.15s",
      }}
    >
      {children}
    </button>
  );
}
