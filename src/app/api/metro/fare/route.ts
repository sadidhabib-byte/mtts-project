import { NextResponse } from "next/server";
import { calculateFare, listStations } from "@/lib/metroFare";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { startStation?: string; endStation?: string };
  try {
    body = (await req.json()) as { startStation?: string; endStation?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const startStation = (body.startStation ?? "").trim();
  const endStation = (body.endStation ?? "").trim();

  if (!startStation || !endStation) {
    return NextResponse.json(
      { ok: false, error: "Start and end stations are required." },
      { status: 400 },
    );
  }
  if (startStation === endStation) {
    return NextResponse.json(
      { ok: false, error: "Start and end stations cannot be the same." },
      { status: 400 },
    );
  }

  // Prefer DB fares when available; fallback to JSON matrix.
  const start = await prisma.metroStation.findUnique({
    where: { name: startStation },
    select: { id: true, active: true },
  });
  const end = await prisma.metroStation.findUnique({
    where: { name: endStation },
    select: { id: true, active: true },
  });

  if (start && end) {
    if (!start.active || !end.active) {
      return NextResponse.json({ ok: false, error: "Inactive station." }, { status: 400 });
    }
    const dbFare = await prisma.metroFare.findUnique({
      where: { fromStationId_toStationId: { fromStationId: start.id, toStationId: end.id } },
      select: { fare: true },
    });
    if (dbFare) {
      return NextResponse.json({ ok: true, fare: dbFare.fare });
    }
    // If stations exist in DB but fare does not, treat as missing.
    return NextResponse.json(
      { ok: false, error: "Fare not found for this route (admin needs to set it)." },
      { status: 404 },
    );
  }

  const stations = listStations();
  const set = new Set(stations);
  if (!set.has(startStation) || !set.has(endStation)) {
    return NextResponse.json({ ok: false, error: "Invalid station selection." }, { status: 400 });
  }

  const fare = calculateFare(startStation, endStation);
  if (fare == null) {
    return NextResponse.json({ ok: false, error: "Fare not found for this route." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, fare });
}

