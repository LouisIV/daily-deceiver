import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ClaudeRequest = {
  system?: string;
  messages?: unknown[];
  tools?: unknown[];
  maxTokens?: number;
};

type ClaudeResponse = {
  content?: Array<{ type?: string; text?: string }>;
};

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { system, messages, tools, maxTokens = 1200 } =
      (await req.json()) as ClaudeRequest;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ANTHROPIC_API_KEY" },
        { status: 500 }
      );
    }

    const payload: Record<string, unknown> = {
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: messages ?? [],
    };

    if (system) payload.system = system;
    if (tools) payload.tools = tools;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };

    if (process.env.ANTHROPIC_BETA) {
      headers["anthropic-beta"] = process.env.ANTHROPIC_BETA;
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: `API error ${res.status}`, detail },
        { status: res.status }
      );
    }

    const data = (await res.json()) as ClaudeResponse;
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text || "")
      .join("\n");

    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
