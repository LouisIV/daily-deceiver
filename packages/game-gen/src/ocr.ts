import { AI_GATEWAY_API_KEY, AI_GATEWAY_BASE_URL, GEMINI_OCR_MODEL } from "./config.js";
import type { OcrClipping, OcrPromptConfig } from "./types.js";
import { logStep, stripSchemaExtras } from "./utils.js";

function loadOcrPrompt(): OcrPromptConfig {
  return {
    prompt:
      "Extract the headlines and body of each story. Only return interesting or unique stories. Return 3-5 clippings. The body should be two to three lines from the main body of the article. If there is a sub-heading include it (usually capitalized). Return only text that appears in the document",
    schema: stripSchemaExtras({
      type: "object",
      properties: {
        clippings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              headline: { type: "string" },
              body: { type: "string" },
              "sub-heading": { type: "string" },
            },
            required: ["headline", "body"],
          },
        },
      },
    }),
  };
}

async function ocrWithGemini(imageUrl: string, promptConfig: OcrPromptConfig): Promise<OcrClipping[]> {
  const res = await fetch(`${AI_GATEWAY_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
    },
    body: JSON.stringify({
      model: GEMINI_OCR_MODEL,
      max_tokens: 1500,
      messages: [
        { role: "system", content: promptConfig.prompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract text from this newspaper page image." },
            { type: "image_url", image_url: { url: imageUrl, detail: "auto" } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "clippings",
          schema: promptConfig.schema,
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`AI Gateway OCR error ${res.status}: ${await res.text()}`);
  }

  const data: any = await res.json();
  const usage = data.usage || {};
  if (usage.prompt_tokens || usage.completion_tokens) {
    logStep(`  Gemini OCR usage: in=${usage.prompt_tokens || 0} out=${usage.completion_tokens || 0}`);
  }

  const text = data.choices?.[0]?.message?.content || "";
  const parsed = JSON.parse(text);
  const clippings = Array.isArray(parsed?.clippings) ? parsed.clippings : [];
  return clippings;
}

export { loadOcrPrompt, ocrWithGemini };
