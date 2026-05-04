import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { releaseExpiredBusHolds } from "@/app/api/bus/_seatState";

export const runtime = "nodejs";

function uniqueStrings(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export async function POST(req: NextRequest) {
  await releaseExpiredBusHolds();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.sub;
  if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { tripId?: string; seatCodes?: unknown };
  try {
    body = (await req.json()) as { tripId?: string; seatCodes?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const tripId = (body.tripId ?? "").trim();
  const seatCodes = uniqueStrings(body.seatCodes);
  if (!tripId) return NextResponse.json({ ok: false, error: "Missing tripId" }, { status: 400 });
  if (seatCodes.length < 1) return NextResponse.json({ ok: false, error: "Select at least one seat." }, { status: 400 });
  if (seatCodes.length > 6) return NextResponse.json({ ok: false, error: "Max 6 seats per booking." }, { status: 400 });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    // Cancel existing holds by this user (simple MVP rule: one hold at a time)
    const existing = await tx.busSeatHold.findMany({
      where: { userId, expiresAt: { gt: now } },
      select: { id: true },
    });
    if (existing.length > 0) {
      const ids = existing.map((h) => h.id);
      await tx.busTripSeatState.updateMany({
        where: { holdId: { in: ids }, state: "HELD" },
        data: { state: "AVAILABLE", holdId: null, expiresAt: null },
      });
      await tx.busSeatHold.deleteMany({ where: { id: { in: ids } } });
    }

    const hold = await tx.busSeatHold.create({
      data: { userId, tripId, expiresAt },
      select: { id: true, expiresAt: true },
    });

    const updated = await tx.busTripSeatState.updateMany({
      where: { tripId, seatCode: { in: seatCodes }, state: "AVAILABLE" },
      data: { state: "HELD", holdId: hold.id, expiresAt },
    });

    if (updated.count !== seatCodes.length) {
      // Rollback
      throw new Error("One or more seats are no longer available.");
    }

    return { holdId: hold.id, expiresAt: hold.expiresAt.toISOString() };
  });

  return NextResponse.json({ ok: true, ...result });
}

