import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { releaseExpiredBusHolds } from "@/app/api/bus/_seatState";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  await releaseExpiredBusHolds();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.sub;
  if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const hold = await prisma.busSeatHold.findFirst({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
    select: { id: true, tripId: true, expiresAt: true },
  });
  if (!hold) return NextResponse.json({ ok: true, hold: null });

  const seats = await prisma.busTripSeatState.findMany({
    where: { holdId: hold.id, tripId: hold.tripId, state: "HELD" },
    select: { seatCode: true },
    orderBy: { seatCode: "asc" },
  });

  return NextResponse.json({
    ok: true,
    hold: {
      id: hold.id,
      tripId: hold.tripId,
      expiresAt: hold.expiresAt.toISOString(),
      seats: seats.map((s) => s.seatCode),
    },
  });
}

