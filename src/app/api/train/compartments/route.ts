import { NextResponse, type NextRequest } from "next/server";
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
  const dateStr = (url.searchParams.get("date") ?? "").trim();

  if (!trainId) return NextResponse.json({ ok: false, error: "Missing trainId" }, { status: 400 });
  const journeyDate = parseJourneyDate(dateStr);
  if (!journeyDate) {
    return NextResponse.json({ ok: false, error: "Invalid date (use YYYY-MM-DD)" }, { status: 400 });
  }

  const train = await prisma.train.findUnique({
    where: { id: trainId },
    select: {
      id: true,
      name: true,
      fare: true,
      departureTime: true,
      active: true,
      startStation: { select: { name: true } },
      endStation: { select: { name: true } },
      compartments: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, totalSeats: true },
      },
    },
  });
  if (!train) return NextResponse.json({ ok: false, error: "Train not found" }, { status: 404 });

  // Lazily seed seat states for this (train, date) for every compartment.
  for (const c of train.compartments) {
    await ensureSeatStates({
      trainId: train.id,
      compartmentId: c.id,
      journeyDate,
      totalSeats: c.totalSeats,
    });
  }

  // Aggregate counts per compartment.
  const grouped = await prisma.trainSeatState.groupBy({
    by: ["compartmentId", "state"],
    where: { trainId: train.id, journeyDate },
    _count: { _all: true },
  });

  const counts = new Map<string, { available: number; held: number; booked: number }>();
  for (const c of train.compartments) {
    counts.set(c.id, { available: 0, held: 0, booked: 0 });
  }
  for (const g of grouped) {
    const row = counts.get(g.compartmentId);
    if (!row) continue;
    if (g.state === "AVAILABLE") row.available = g._count._all;
    else if (g.state === "HELD") row.held = g._count._all;
    else if (g.state === "BOOKED") row.booked = g._count._all;
  }

  return NextResponse.json({
    ok: true,
    train: {
      id: train.id,
      name: train.name,
      fromStation: train.startStation.name,
      toStation: train.endStation.name,
      departureTime: train.departureTime.toISOString().slice(11, 16),
      fare: train.fare,
      journeyDate: dateStr,
    },
    compartments: train.compartments.map((c) => {
      const stat = counts.get(c.id) ?? { available: 0, held: 0, booked: 0 };
      return {
        id: c.id,
        name: c.name,
        totalSeats: c.totalSeats,
        available: stat.available,
        held: stat.held,
        booked: stat.booked,
      };
    }),
  });
}
