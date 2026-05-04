import { NextResponse, type NextRequest } from "next/server";
import { appendFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type Payload = {
  sessionId?: string;
  runId?: string;
  hypothesisId?: string;
  location?: string;
  message?: string;
  data?: unknown;
  timestamp?: number;
};

export async function POST(req: NextRequest) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const safe: Payload = {
    sessionId: body.sessionId,
    runId: body.runId,
    hypothesisId: body.hypothesisId,
    location: body.location,
    message: body.message,
    data: body.data,
    timestamp: typeof body.timestamp === "number" ? body.timestamp : Date.now(),
  };

  const logPath = path.join(process.cwd(), "..", "debug-b0b5df.log");
  await appendFile(logPath, `${JSON.stringify(safe)}\n`, "utf8");
  return NextResponse.json({ ok: true });
}

