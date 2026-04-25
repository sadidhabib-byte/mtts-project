import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/_auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const stations = await prisma.metroStation.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const fares = await prisma.metroFare.findMany({
    include: {
      fromStation: { select: { id: true, name: true } },
      toStation: { select: { id: true, name: true } },
    },
    orderBy: [{ fromStationId: "asc" }, { toStationId: "asc" }],
  });

  return NextResponse.json({ ok: true, stations, fares });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { fromStationId?: string; toStationId?: string; fare?: number };
  try {
    body = (await req.json()) as { fromStationId?: string; toStationId?: string; fare?: number };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const fromStationId = (body.fromStationId ?? "").trim();
  const toStationId = (body.toStationId ?? "").trim();
  const fare = body.fare;

  if (!fromStationId || !toStationId || typeof fare !== "number") {
    return NextResponse.json({ ok: false, error: "Missing fields." }, { status: 400 });
  }
  if (fromStationId === toStationId) {
    return NextResponse.json({ ok: false, error: "Stations must be different." }, { status: 400 });
  }
  if (!Number.isFinite(fare) || fare < 0 || fare > 10000) {
    return NextResponse.json({ ok: false, error: "Invalid fare." }, { status: 400 });
  }

  const updated = await prisma.metroFare.upsert({
    where: { fromStationId_toStationId: { fromStationId, toStationId } },
    update: { fare: Math.round(fare) },
    create: { fromStationId, toStationId, fare: Math.round(fare) },
    select: { id: true, fare: true, fromStationId: true, toStationId: true },
  });

  // Keep reverse direction aligned (optional but useful)
  await prisma.metroFare.upsert({
    where: { fromStationId_toStationId: { fromStationId: toStationId, toStationId: fromStationId } },
    update: { fare: Math.round(fare) },
    create: { fromStationId: toStationId, toStationId: fromStationId, fare: Math.round(fare) },
  });

  return NextResponse.json({ ok: true, fare: updated });
}

