import { NextResponse } from "next/server";
import { encodeSharePayloadToken } from "@/lib/game/share-server";
import type { SharePayload } from "@/lib/game/share";

export const runtime = "nodejs";

const isDev = process.env.NODE_ENV === "development";
const secret = process.env.OG_SHARE_SECRET;

export async function POST(request: Request) {
  if (!isDev && !secret) {
    return NextResponse.json(
      { error: "Share encoding is not configured (OG_SHARE_SECRET required in production)" },
      { status: 503 },
    );
  }
  try {
    const body = (await request.json()) as Partial<SharePayload>;
    const h = encodeSharePayloadToken(body, isDev ? secret : secret!);
    return NextResponse.json({ h });
  } catch {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 },
    );
  }
}
