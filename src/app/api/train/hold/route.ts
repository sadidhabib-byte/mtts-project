import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { releaseExpiredTrainHolds } from "@/app/api/train/_seatState";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  await releaseExpiredTrainHolds();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.sub;
  if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const hold = await prisma.trainSeatHold.findFirst({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
    select: { id: true, trainId: true, journeyDate: true, expiresAt: true },
  });
  if (!hold) return NextResponse.json({ ok: true, hold: null });

  const seats = await prisma.trainSeatState.findMany({
    where: { holdId: hold.id, state: "HELD" },
    orderBy: [{ compartmentId: "asc" }, { seatNumber: "asc" }],
    select: {
      compartmentId: true,
      seatNumber: true,
      compartment: { select: { name: true } },
    },
  });

  // For convenience, include train + journey context for the checkout/timer UI.
  const train = await prisma.train.findUnique({
    where: { id: hold.trainId },
    select: {
      id: true,
      name: true,
      fare: true,
      departureTime: true,
      startStation: { select: { name: true } },
      endStation: { select: { name: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    hold: {
      id: hold.id,
      trainId: hold.trainId,
      journeyDate: hold.journeyDate.toISOString().slice(0, 10),
      expiresAt: hold.expiresAt.toISOString(),
      train: train
        ? {
            id: train.id,
            name: train.name,
            fare: train.fare,
            departureTime: train.departureTime.toISOString().slice(11, 16),
            fromStation: train.startStation.name,
            toStation: train.endStation.name,
          }
        : null,
      seats: seats.map((s) => ({
        compartmentId: s.compartmentId,
        compartmentName: s.compartment.name,
        seatNumber: s.seatNumber,
      })),
    },
  });
}
