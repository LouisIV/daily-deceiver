import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { AI_GATEWAY_API_KEY, AI_GATEWAY_BASE_URL, GEMINI_OCR_MODEL } from "./config.js";
import type { OcrClipping, OcrPromptConfig } from "./types.js";
import { logStep } from "./utils.js";

// The Vercel AI Gateway exposes an OpenAI-compatible API
const gatewayProvider = createOpenAI({
  apiKey: AI_GATEWAY_API_KEY,
  baseURL: AI_GATEWAY_BASE_URL,
});

const clippingSchema = z.object({
  clippings: z.array(
    z.object({
      headline: z.string(),
      body: z.string(),
      "sub-heading": z.string().optional(),
    })
  ),
});

function loadOcrPrompt(): OcrPromptConfig {
  return {
    prompt:
      "Extract the headlines and body of each story. Only return interesting or unique stories. Return 3-5 clippings. The body should be two to three lines from the main body of the article. If there is a sub-heading include it (usually capitalized). Return only text that appears in the document",
    schema: {},
  };
}

async function ocrWithGemini(imageUrl: string, promptConfig: OcrPromptConfig): Promise<OcrClipping[]> {
  const result = await generateText({
    model: gatewayProvider(GEMINI_OCR_MODEL),
    experimental_output: Output.object({ schema: clippingSchema }),
    system: promptConfig.prompt,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Extract text from this newspaper page image." },
          { type: "image", image: new URL(imageUrl) },
        ],
      },
    ],
  });

  const { inputTokens, outputTokens } = result.usage;
  if (inputTokens || outputTokens) {
    logStep(`  Gemini OCR usage: in=${inputTokens ?? 0} out=${outputTokens ?? 0}`);
  }

  return result.output.clippings;
}

export { loadOcrPrompt, ocrWithGemini };
