import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJourneyDate } from "@/app/api/train/_seatState";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const fromName = (url.searchParams.get("from") ?? "").trim();
  const toName = (url.searchParams.get("to") ?? "").trim();
  const date = (url.searchParams.get("date") ?? "").trim(); // YYYY-MM-DD

  if (!fromName || !toName || !date) {
    return NextResponse.json({ ok: false, error: "Missing from/to/date" }, { status: 400 });
  }
  if (!parseJourneyDate(date)) {
    return NextResponse.json({ ok: false, error: "Invalid date (use YYYY-MM-DD)" }, { status: 400 });
  }
  if (fromName.toLowerCase() === toName.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "From and To cannot be the same." }, { status: 400 });
  }

  const [from, to] = await Promise.all([
    prisma.trainStation.findUnique({ where: { name: fromName }, select: { id: true } }),
    prisma.trainStation.findUnique({ where: { name: toName }, select: { id: true } }),
  ]);
  if (!from || !to) return NextResponse.json({ ok: true, trains: [] });

  const trains = await prisma.train.findMany({
    where: { startStationId: from.id, endStationId: to.id, active: true },
    orderBy: { departureTime: "asc" },
    select: {
      id: true,
      name: true,
      departureTime: true,
      fare: true,
      startStation: { select: { name: true } },
      endStation: { select: { name: true } },
      compartments: { select: { id: true, totalSeats: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    trains: trains.map((t) => ({
      id: t.id,
      name: t.name,
      departureTime: t.departureTime.toISOString().slice(11, 16),
      fare: t.fare,
      fromStation: t.startStation.name,
      toStation: t.endStation.name,
      totalSeats: t.compartments.reduce((acc, c) => acc + c.totalSeats, 0),
      compartmentCount: t.compartments.length,
    })),
  });
}
