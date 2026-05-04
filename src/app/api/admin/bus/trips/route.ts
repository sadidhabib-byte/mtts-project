import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/_auth";

export const runtime = "nodejs";

function asDateOnly(s: string) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const trips = await prisma.busTrip.findMany({
    orderBy: [{ journeyDate: "asc" }, { departureTime: "asc" }],
    select: {
      id: true,
      journeyDate: true,
      departureTime: true,
      fare: true,
      busType: true,
      active: true,
      route: { select: { id: true, fromCity: true, toCity: true } },
      bus: { select: { id: true, name: true, operator: { select: { name: true } } } },
    },
  });

  const routes = await prisma.busRoute.findMany({
    where: { active: true },
    orderBy: [{ fromCity: "asc" }, { toCity: "asc" }],
    select: { id: true, fromCity: true, toCity: true },
  });

  const buses = await prisma.bus.findMany({
    where: { active: true },
    orderBy: [{ operator: { name: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, operator: { select: { name: true } }, seatLayout: { select: { id: true } } },
  });

  return NextResponse.json({ ok: true, trips, routes, buses });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: {
    routeId?: string;
    busId?: string;
    journeyDate?: string;
    departureTime?: string;
    fare?: number;
    busType?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const routeId = (body.routeId ?? "").trim();
  const busId = (body.busId ?? "").trim();
  const fare = typeof body.fare === "number" ? Math.floor(body.fare) : NaN;
  const busType = (body.busType ?? "").trim() || "AC";
  const journeyDate = body.journeyDate ? asDateOnly(body.journeyDate) : null;

  // departureTime is "HH:MM"
  const dt = (body.departureTime ?? "").trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(dt);
  if (!routeId || !busId) return NextResponse.json({ ok: false, error: "Missing route/bus" }, { status: 400 });
  if (!journeyDate) return NextResponse.json({ ok: false, error: "Invalid journeyDate" }, { status: 400 });
  if (!m) return NextResponse.json({ ok: false, error: "Invalid departureTime (HH:MM)" }, { status: 400 });
  if (!Number.isFinite(fare) || fare < 0) return NextResponse.json({ ok: false, error: "Invalid fare" }, { status: 400 });

  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return NextResponse.json({ ok: false, error: "Invalid departureTime" }, { status: 400 });
  }
  const departureTime = new Date(Date.UTC(1970, 0, 1, hh, mm, 0));

  const busLayout = await prisma.busSeatLayout.findUnique({ where: { busId }, select: { layoutJson: true } });
  if (!busLayout) {
    return NextResponse.json({ ok: false, error: "Bus is missing a seat layout." }, { status: 409 });
  }

  const trip = await prisma.busTrip.create({
    data: { routeId, busId, journeyDate, departureTime, fare, busType, active: true },
    select: { id: true },
  });

  // Seed seat state rows from layout JSON (AVAILABLE)
  const layout = busLayout.layoutJson as { cells?: Array<Array<{ t?: string; code?: string }>> };
  const seatCodes: string[] = [];
  for (const row of layout.cells ?? []) {
    for (const cell of row ?? []) {
      if (cell?.t === "seat" && typeof cell.code === "string") seatCodes.push(cell.code);
    }
  }

  if (seatCodes.length > 0) {
    await prisma.busTripSeatState.createMany({
      data: seatCodes.map((seatCode) => ({ tripId: trip.id, seatCode, state: "AVAILABLE" })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true, tripId: trip.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; active?: boolean };
  try {
    body = (await req.json()) as { id?: string; active?: boolean };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const id = (body.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  if (typeof body.active !== "boolean") return NextResponse.json({ ok: false, error: "Missing active" }, { status: 400 });

  const trip = await prisma.busTrip.update({ where: { id }, data: { active: body.active }, select: { id: true, active: true } });
  return NextResponse.json({ ok: true, trip });
}

