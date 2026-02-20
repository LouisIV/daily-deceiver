/** Default issue options shown when reporting a clipping */
export const CLIPPING_ISSUE_PRESETS = [
  { value: "text_looks_ai", label: "Text looks AI-generated or unnatural" },
  { value: "wrong_language", label: "Wrong or anachronistic language" },
  { value: "offensive_language", label: "Offensive or outdated language" },
  { value: "formatting_ocr", label: "Formatting or text recognition errors" },
  { value: "misleading_content", label: "Misleading or inaccurate content" },
  { value: "other", label: "Other" },
] as const;

export type ClippingIssuePresetValue = (typeof CLIPPING_ISSUE_PRESETS)[number]["value"];
