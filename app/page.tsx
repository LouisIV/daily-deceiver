"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import posthog from "posthog-js";

import { LoadScreen } from "./components/LoadScreen";
import { Masthead } from "./components/Masthead";
import { PlayScreen } from "./components/PlayScreen";
import { ResultScreen } from "./components/ResultScreen";
import { getLayout, shuffle } from "@/lib/game/snippets";
import { getGrade } from "@/lib/game/grades";
import type { Answered, HistoryItem, Phase, Round, Snippet } from "@/lib/game/types";

const TOTAL = 10;

export default function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [progress, setProgress] = useState<string>("Setting the type…");
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [answered, setAnswered] = useState<Answered>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const initRan = useRef(false);
  const playMarked = useRef(false);

  const loadGame = useCallback(async (): Promise<void> => {
    setPhase("loading");
    setError(null);
    setProgress("Fetching today's edition…");
    try {
      const url = process.env.NEXT_PUBLIC_DAILY_GAME_URL || "/fallback-game.json";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load game (${res.status})`);
      const daily = (await res.json()) as { snippets?: Snippet[] };
      if (!Array.isArray(daily.snippets) || daily.snippets.length < 6) {
        throw new Error("Invalid game data");
      }
      const selected = shuffle(daily.snippets)
        .slice(0, TOTAL)
        .map((r, i) => ({ ...r, layout: getLayout(i) }));
      setRounds(selected);
      setCurrent(0);
      setScore(0);
      setAnswered(null);
      setHistory([]);
      setPhase("playing");
      posthog.capture("game_started", {
        total_questions: selected.length,
        game_url: url,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      posthog.capture("game_load_failed", {
        error_message: message,
      });
    }
  }, []);

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    loadGame();
  }, [loadGame]);

  const snippet = rounds[current];

  const markPlayed = useCallback(() => {
    if (playMarked.current) return;
    playMarked.current = true;
    const distinctId = posthog.get_distinct_id();
    void fetch("/api/plays", {
      method: "POST",
      keepalive: true,
      headers: distinctId ? { "x-posthog-distinct-id": distinctId } : {},
    }).catch(() => {
      playMarked.current = false;
    });
  }, []);

  const guess = useCallback(
    (isReal: boolean) => {
      if (answered || !snippet) return;
      markPlayed();
      const ok = isReal === snippet.real;
      setAnswered(ok ? "correct" : "wrong");
      if (ok) setScore((s) => s + 1);
      setHistory((h) => [...h, { snippet, guessReal: isReal, correct: ok }]);
      posthog.capture("clipping_guessed", {
        question_number: current + 1,
        guess: isReal ? "real" : "fake",
        correct: ok,
        clipping_is_real: snippet.real,
        headline: snippet.headline,
      });
    },
    [answered, current, markPlayed, snippet]
  );

  const next = useCallback(() => {
    if (current + 1 >= rounds.length) {
      setPhase("over");
      const [gradeTitle] = getGrade(score);
      posthog.capture("game_completed", {
        score,
        total_questions: rounds.length,
        grade: gradeTitle,
        accuracy: rounds.length > 0 ? score / rounds.length : 0,
      });
    } else {
      setCurrent((c) => c + 1);
      setAnswered(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, rounds.length, score]);

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

  return (
    <div className="paper-texture" style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 16px 80px" }}>
        <Masthead score={score} current={current} phase={phase} />

        {phase === "loading" && <LoadScreen progress={progress} error={error} retry={loadGame} />}
        {phase === "playing" && snippet && (
          <PlayScreen
            snippet={snippet}
            current={current}
            total={rounds.length}
            answered={answered}
            guess={guess}
            next={next}
          />
        )}
        {phase === "over" && (
          <ResultScreen
            score={score}
            total={rounds.length}
            grade={getGrade(score)}
            history={history}
            restart={loadGame}
          />
        )}
      </div>
    </div>
  );
}
