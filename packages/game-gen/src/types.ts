export type Snippet = {
  headline: string;
  text: string;
  real: boolean;
  pdfUrl?: string;
  imageUrl?: string;
  pageUrl?: string;
  source?: string;
  score?: number;
};

export type LocItem = Record<string, any>;

export type OcrClipping = {
  headline?: string;
  body?: string;
  "sub-heading"?: string;
  subheading?: string;
  subHeading?: string;
};

export type OcrPromptConfig = {
  prompt: string;
  schema: unknown;
};
