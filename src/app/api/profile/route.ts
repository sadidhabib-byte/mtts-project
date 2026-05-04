import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getUserSession();
  const userId = session?.user?.id;
  // #region agent log
  fetch("/api/debug/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "b0b5df",
      runId: "pre-fix",
      hypothesisId: "H3",
      location: "src/app/api/profile/route.ts:12",
      message: "GET /api/profile session check",
      data: { hasSession: !!session, hasUserId: !!userId, cookieCount: req.cookies.getAll().length },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatarPath: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  return NextResponse.json({ ok: true, user });
}

export async function PATCH(req: NextRequest) {
  const session = await getUserSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; email?: string };
  try {
    body = (await req.json()) as { name?: string; email?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const data: { name?: string; email?: string } = {};
  if (typeof body.name === "string" && body.name.trim().length >= 2) data.name = body.name.trim();
  if (typeof body.email === "string" && body.email.includes("@")) {
    data.email = body.email.toLowerCase().trim();
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, avatarPath: true },
    });
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ ok: false, error: "Update failed (email may already be used)." }, { status: 400 });
  }
}

