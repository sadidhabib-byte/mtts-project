import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/_auth";

export const runtime = "nodejs";

function normName(s: unknown) {
  return typeof s === "string" ? s.trim().replace(/\s+/g, " ") : "";
}

function parseTimeHHMM(input: unknown): Date | null {
  if (typeof input !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return new Date(Date.UTC(1970, 0, 1, hh, mm, 0));
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const trains = await prisma.train.findMany({
    orderBy: [{ name: "asc" }, { departureTime: "asc" }],
    select: {
      id: true,
      name: true,
      fare: true,
      departureTime: true,
      active: true,
      startStation: { select: { id: true, name: true } },
      endStation: { select: { id: true, name: true } },
      compartments: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, totalSeats: true },
      },
    },
  });

  const stations = await prisma.trainStation.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return NextResponse.json({
    ok: true,
    trains: trains.map((t) => ({
      ...t,
      departureTime: t.departureTime.toISOString().slice(11, 16),
    })),
    stations,
  });
}

/**
 * Create a train. Mirrors the legacy admin behaviour:
 *  - Adds the requested train.
 *  - Adds a symmetric reverse-direction train with the same name/time/fare.
 *  - Each train auto-gets `numCompartments` compartments (default 4) at 50 seats each.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: {
    name?: string;
    startStationId?: string;
    endStationId?: string;
    departureTime?: string;
    reverseDepartureTime?: string;
    fare?: number;
    numCompartments?: number;
    compartmentSeats?: number;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = normName(body.name);
  const startStationId = (body.startStationId ?? "").trim();
  const endStationId = (body.endStationId ?? "").trim();
  const departureTime = parseTimeHHMM(body.departureTime);
  const reverseDepartureTime = body.reverseDepartureTime
    ? parseTimeHHMM(body.reverseDepartureTime)
    : departureTime;
  const fare = typeof body.fare === "number" ? Math.floor(body.fare) : NaN;
  const numCompartments = Math.min(
    Math.max(typeof body.numCompartments === "number" ? Math.floor(body.numCompartments) : 4, 1),
    20,
  );
  const compartmentSeats = Math.min(
    Math.max(typeof body.compartmentSeats === "number" ? Math.floor(body.compartmentSeats) : 50, 1),
    200,
  );

  if (name.length < 2) return NextResponse.json({ ok: false, error: "Train name is required" }, { status: 400 });
  if (!startStationId || !endStationId) {
    return NextResponse.json({ ok: false, error: "Missing start/end station" }, { status: 400 });
  }
  if (startStationId === endStationId) {
    return NextResponse.json({ ok: false, error: "Start and end station cannot be the same." }, { status: 400 });
  }
  if (!departureTime) return NextResponse.json({ ok: false, error: "Invalid departureTime (HH:MM)" }, { status: 400 });
  if (!reverseDepartureTime) {
    return NextResponse.json({ ok: false, error: "Invalid reverseDepartureTime (HH:MM)" }, { status: 400 });
  }
  if (!Number.isFinite(fare) || fare < 0) {
    return NextResponse.json({ ok: false, error: "Invalid fare" }, { status: 400 });
  }

  const [forward, reverse] = await prisma.$transaction(async (tx) => {
    const f = await tx.train.create({
      data: {
        name,
        startStationId,
        endStationId,
        departureTime,
        fare,
        active: true,
        compartments: {
          create: Array.from({ length: numCompartments }, (_, i) => ({
            name: `C${i + 1}`,
            totalSeats: compartmentSeats,
          })),
        },
      },
      select: { id: true },
    });
    const r = await tx.train.create({
      data: {
        name,
        startStationId: endStationId,
        endStationId: startStationId,
        departureTime: reverseDepartureTime,
        fare,
        active: true,
        compartments: {
          create: Array.from({ length: numCompartments }, (_, i) => ({
            name: `C${i + 1}`,
            totalSeats: compartmentSeats,
          })),
        },
      },
      select: { id: true },
    });
    return [f, r];
  });

  return NextResponse.json({ ok: true, trainIds: [forward.id, reverse.id] }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: {
    id?: string;
    active?: boolean;
    name?: string;
    fare?: number;
    departureTime?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const id = (body.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const data: { active?: boolean; name?: string; fare?: number; departureTime?: Date } = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.name === "string") {
    const name = normName(body.name);
    if (name.length < 2) return NextResponse.json({ ok: false, error: "Train name is required" }, { status: 400 });
    data.name = name;
  }
  if (typeof body.fare === "number") {
    const fare = Math.floor(body.fare);
    if (!Number.isFinite(fare) || fare < 0) {
      return NextResponse.json({ ok: false, error: "Invalid fare" }, { status: 400 });
    }
    data.fare = fare;
  }
  if (typeof body.departureTime === "string") {
    const t = parseTimeHHMM(body.departureTime);
    if (!t) return NextResponse.json({ ok: false, error: "Invalid departureTime (HH:MM)" }, { status: 400 });
    data.departureTime = t;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
  }

  const train = await prisma.train.update({
    where: { id },
    data,
    select: { id: true, active: true, name: true, fare: true, departureTime: true },
  });
  return NextResponse.json({
    ok: true,
    train: { ...train, departureTime: train.departureTime.toISOString().slice(11, 16) },
  });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = (url.searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const bookingCount = await prisma.trainBooking.count({ where: { trainId: id } });
  if (bookingCount > 0) {
    return NextResponse.json(
      { ok: false, error: "This train has bookings. Disable it instead of deleting." },
      { status: 409 },
    );
  }
  const holdCount = await prisma.trainSeatHold.count({
    where: { trainId: id, expiresAt: { gt: new Date() } },
  });
  if (holdCount > 0) {
    return NextResponse.json(
      { ok: false, error: "This train has active seat holds. Try again in a few minutes." },
      { status: 409 },
    );
  }

  await prisma.train.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
