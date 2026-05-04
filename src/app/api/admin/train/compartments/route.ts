import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/_auth";

export const runtime = "nodejs";

function normName(s: unknown) {
  return typeof s === "string" ? s.trim().replace(/\s+/g, " ") : "";
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const trainId = (url.searchParams.get("trainId") ?? "").trim();
  if (!trainId) return NextResponse.json({ ok: false, error: "Missing trainId" }, { status: 400 });

  const compartments = await prisma.trainCompartment.findMany({
    where: { trainId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, totalSeats: true },
  });
  return NextResponse.json({ ok: true, compartments });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { trainId?: string; name?: string; totalSeats?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const trainId = (body.trainId ?? "").trim();
  const name = normName(body.name);
  const totalSeats = typeof body.totalSeats === "number" ? Math.floor(body.totalSeats) : 50;

  if (!trainId) return NextResponse.json({ ok: false, error: "Missing trainId" }, { status: 400 });
  if (name.length < 1) return NextResponse.json({ ok: false, error: "Compartment name is required" }, { status: 400 });
  if (!Number.isFinite(totalSeats) || totalSeats < 1 || totalSeats > 200) {
    return NextResponse.json({ ok: false, error: "totalSeats must be 1..200" }, { status: 400 });
  }

  try {
    const c = await prisma.trainCompartment.create({
      data: { trainId, name, totalSeats },
      select: { id: true, name: true, totalSeats: true },
    });
    return NextResponse.json({ ok: true, compartment: c }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create compartment.";
    return NextResponse.json({ ok: false, error: msg }, { status: 409 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; name?: string; totalSeats?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const id = (body.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const data: { name?: string; totalSeats?: number } = {};
  if (typeof body.name === "string") {
    const name = normName(body.name);
    if (name.length < 1) {
      return NextResponse.json({ ok: false, error: "Compartment name is required" }, { status: 400 });
    }
    data.name = name;
  }
  if (typeof body.totalSeats === "number") {
    const n = Math.floor(body.totalSeats);
    if (!Number.isFinite(n) || n < 1 || n > 200) {
      return NextResponse.json({ ok: false, error: "totalSeats must be 1..200" }, { status: 400 });
    }
    // Block lowering totalSeats below the highest already-booked/held seat number.
    const max = await prisma.trainSeatState.aggregate({
      where: { compartmentId: id, state: { in: ["HELD", "BOOKED"] } },
      _max: { seatNumber: true },
    });
    if (max._max.seatNumber && n < max._max.seatNumber) {
      return NextResponse.json(
        {
          ok: false,
          error: `Cannot lower totalSeats below ${max._max.seatNumber} (already booked/held).`,
        },
        { status: 409 },
      );
    }
    data.totalSeats = n;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
  }

  const c = await prisma.trainCompartment.update({
    where: { id },
    data,
    select: { id: true, name: true, totalSeats: true },
  });
  return NextResponse.json({ ok: true, compartment: c });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = (url.searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const bookingCount = await prisma.trainBookingSeat.count({ where: { compartmentId: id } });
  if (bookingCount > 0) {
    return NextResponse.json(
      { ok: false, error: "This compartment has bookings. Cannot delete." },
      { status: 409 },
    );
  }

  await prisma.trainCompartment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
