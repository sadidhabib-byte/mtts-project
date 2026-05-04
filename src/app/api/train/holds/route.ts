import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import {
  ensureSeatStates,
  parseJourneyDate,
  releaseExpiredTrainHolds,
} from "@/app/api/train/_seatState";

export const runtime = "nodejs";

function uniqueSeatNumbers(arr: unknown): number[] {
  if (!Array.isArray(arr)) return [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const v of arr) {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out.sort((a, b) => a - b);
}

export async function POST(req: NextRequest) {
  await releaseExpiredTrainHolds();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.sub;
  if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: {
    trainId?: string;
    compartmentId?: string;
    journeyDate?: string;
    seatNumbers?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const trainId = (body.trainId ?? "").trim();
  const compartmentId = (body.compartmentId ?? "").trim();
  const journeyDate = parseJourneyDate(body.journeyDate ?? null);
  const seatNumbers = uniqueSeatNumbers(body.seatNumbers);

  if (!trainId || !compartmentId) {
    return NextResponse.json({ ok: false, error: "Missing trainId/compartmentId" }, { status: 400 });
  }
  if (!journeyDate) {
    return NextResponse.json({ ok: false, error: "Invalid date (use YYYY-MM-DD)" }, { status: 400 });
  }
  if (seatNumbers.length < 1) {
    return NextResponse.json({ ok: false, error: "Select at least one seat." }, { status: 400 });
  }
  if (seatNumbers.length > 6) {
    return NextResponse.json({ ok: false, error: "Max 6 seats per booking." }, { status: 400 });
  }

  const compartment = await prisma.trainCompartment.findUnique({
    where: { id: compartmentId },
    select: { id: true, totalSeats: true, trainId: true },
  });
  if (!compartment || compartment.trainId !== trainId) {
    return NextResponse.json({ ok: false, error: "Compartment not found" }, { status: 404 });
  }
  if (seatNumbers.some((n) => n > compartment.totalSeats)) {
    return NextResponse.json({ ok: false, error: "Seat number out of range." }, { status: 400 });
  }

  await ensureSeatStates({
    trainId,
    compartmentId,
    journeyDate,
    totalSeats: compartment.totalSeats,
  });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Cancel any existing user holds (single-hold rule, mirrors bus).
      const existing = await tx.trainSeatHold.findMany({
        where: { userId, expiresAt: { gt: now } },
        select: { id: true },
      });
      if (existing.length > 0) {
        const ids = existing.map((h) => h.id);
        await tx.trainSeatState.updateMany({
          where: { holdId: { in: ids }, state: "HELD" },
          data: { state: "AVAILABLE", holdId: null, expiresAt: null },
        });
        await tx.trainSeatHold.deleteMany({ where: { id: { in: ids } } });
      }

      const hold = await tx.trainSeatHold.create({
        data: { userId, trainId, journeyDate, expiresAt },
        select: { id: true, expiresAt: true },
      });

      const updated = await tx.trainSeatState.updateMany({
        where: {
          trainId,
          compartmentId,
          journeyDate,
          seatNumber: { in: seatNumbers },
          state: "AVAILABLE",
        },
        data: { state: "HELD", holdId: hold.id, expiresAt },
      });
      if (updated.count !== seatNumbers.length) {
        throw new Error("One or more seats are no longer available.");
      }

      return { holdId: hold.id, expiresAt: hold.expiresAt.toISOString() };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to hold seats.";
    return NextResponse.json({ ok: false, error: message }, { status: 409 });
  }
}
