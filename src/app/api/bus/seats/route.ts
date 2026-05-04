import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { releaseExpiredBusHolds } from "@/app/api/bus/_seatState";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  await releaseExpiredBusHolds();

  const url = new URL(req.url);
  const tripId = (url.searchParams.get("tripId") ?? "").trim();
  if (!tripId) return NextResponse.json({ ok: false, error: "Missing tripId" }, { status: 400 });

  const trip = await prisma.busTrip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      fare: true,
      journeyDate: true,
      departureTime: true,
      route: { select: { fromCity: true, toCity: true } },
      bus: {
        select: {
          id: true,
          name: true,
          operator: { select: { name: true } },
          seatLayout: { select: { layoutJson: true, name: true } },
        },
      },
    },
  });
  if (!trip) return NextResponse.json({ ok: false, error: "Trip not found" }, { status: 404 });
  if (!trip.bus.seatLayout) {
    return NextResponse.json({ ok: false, error: "Trip bus has no seat layout" }, { status: 409 });
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.sub ?? null;

  let states = await prisma.busTripSeatState.findMany({
    where: { tripId },
    select: { seatCode: true, state: true, holdId: true, expiresAt: true },
  });

  // If this trip has no seat state rows (or legacy trips from an older layout), initialize from layout.
  if (states.length === 0) {
    const layout = trip.bus.seatLayout.layoutJson as { cells?: Array<Array<{ t?: string; code?: string }>> };
    const seatCodes: string[] = [];
    for (const row of layout.cells ?? []) {
      for (const cell of row ?? []) {
        if (cell?.t === "seat" && typeof cell.code === "string") seatCodes.push(cell.code);
      }
    }
    if (seatCodes.length > 0) {
      await prisma.busTripSeatState.createMany({
        data: seatCodes.map((seatCode) => ({ tripId, seatCode, state: "AVAILABLE" })),
        skipDuplicates: true,
      });
      states = await prisma.busTripSeatState.findMany({
        where: { tripId },
        select: { seatCode: true, state: true, holdId: true, expiresAt: true },
      });
    }
  }

  let myHold: { id: string; expiresAt: string } | null = null;
  if (userId) {
    const h = await prisma.busSeatHold.findFirst({
      where: { tripId, userId, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: "desc" },
      select: { id: true, expiresAt: true },
    });
    if (h) myHold = { id: h.id, expiresAt: h.expiresAt.toISOString() };
  }

  return NextResponse.json({
    ok: true,
    trip: {
      id: trip.id,
      fromCity: trip.route.fromCity,
      toCity: trip.route.toCity,
      fare: trip.fare,
      journeyDate: trip.journeyDate.toISOString().slice(0, 10),
      departureTime: trip.departureTime.toISOString().slice(11, 16),
      busName: `${trip.bus.operator.name} — ${trip.bus.name}`,
      layoutName: trip.bus.seatLayout.name,
    },
    layout: trip.bus.seatLayout.layoutJson,
    seatStates: states.map((s) => ({
      seatCode: s.seatCode,
      state: s.state,
      isMine: myHold ? s.holdId === myHold.id : false,
      expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
    })),
    myHold,
  });
}

