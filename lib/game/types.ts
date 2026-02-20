export type Snippet = {
  headline: string;
  text: string;
  source?: string;
  url?: string;
  pageUrl?: string;
  pdfUrl?: string;
  imageUrl?: string;
  real: boolean;
};

export const LAYOUTS = ["broadside", "column", "notice", "feature", "classified"] as const;
export type LayoutType = (typeof LAYOUTS)[number];

export type Round = Snippet & { layout: LayoutType };

export type Answered = null | "correct" | "wrong";
export type Phase = "loading" | "playing" | "over";

export type HistoryItem = {
  snippet: Round;
  guessReal: boolean;
  correct: boolean;
};
