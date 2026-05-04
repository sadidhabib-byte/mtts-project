import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import {
  ensureSeatStates,
  parseJourneyDate,
  releaseExpiredTrainHolds,
} from "@/app/api/train/_seatState";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  await releaseExpiredTrainHolds();

  const url = new URL(req.url);
  const trainId = (url.searchParams.get("trainId") ?? "").trim();
  const compartmentId = (url.searchParams.get("compartmentId") ?? "").trim();
  const dateStr = (url.searchParams.get("date") ?? "").trim();

  if (!trainId || !compartmentId) {
    return NextResponse.json({ ok: false, error: "Missing trainId/compartmentId" }, { status: 400 });
  }
  const journeyDate = parseJourneyDate(dateStr);
  if (!journeyDate) {
    return NextResponse.json({ ok: false, error: "Invalid date (use YYYY-MM-DD)" }, { status: 400 });
  }

  const compartment = await prisma.trainCompartment.findUnique({
    where: { id: compartmentId },
    select: {
      id: true,
      name: true,
      totalSeats: true,
      trainId: true,
      train: {
        select: {
          id: true,
          name: true,
          fare: true,
          departureTime: true,
          startStation: { select: { name: true } },
          endStation: { select: { name: true } },
        },
      },
    },
  });
  if (!compartment || compartment.trainId !== trainId) {
    return NextResponse.json({ ok: false, error: "Compartment not found" }, { status: 404 });
  }

  await ensureSeatStates({
    trainId,
    compartmentId,
    journeyDate,
    totalSeats: compartment.totalSeats,
  });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.sub ?? null;

  const states = await prisma.trainSeatState.findMany({
    where: { trainId, compartmentId, journeyDate },
    orderBy: { seatNumber: "asc" },
    select: { seatNumber: true, state: true, holdId: true, expiresAt: true },
  });

  let myHold: { id: string; expiresAt: string } | null = null;
  if (userId) {
    const h = await prisma.trainSeatHold.findFirst({
      where: { userId, trainId, journeyDate, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: "desc" },
      select: { id: true, expiresAt: true },
    });
    if (h) myHold = { id: h.id, expiresAt: h.expiresAt.toISOString() };
  }

  return NextResponse.json({
    ok: true,
    train: {
      id: compartment.train.id,
      name: compartment.train.name,
      fromStation: compartment.train.startStation.name,
      toStation: compartment.train.endStation.name,
      departureTime: compartment.train.departureTime.toISOString().slice(11, 16),
      fare: compartment.train.fare,
      journeyDate: dateStr,
    },
    compartment: { id: compartment.id, name: compartment.name, totalSeats: compartment.totalSeats },
    seatStates: states.map((s) => ({
      seatNumber: s.seatNumber,
      state: s.state,
      isMine: myHold ? s.holdId === myHold.id : false,
      expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
    })),
    myHold,
  });
}
