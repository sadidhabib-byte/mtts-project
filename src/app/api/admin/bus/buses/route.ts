import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/_auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const operators = await prisma.busOperator.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const buses = await prisma.bus.findMany({
    orderBy: [{ operator: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      active: true,
      operator: { select: { id: true, name: true } },
      seatLayout: { select: { id: true, name: true, layoutJson: true, updatedAt: true } },
    },
  });

  return NextResponse.json({ ok: true, operators, buses });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { operatorId?: string; name?: string };
  try {
    body = (await req.json()) as { operatorId?: string; name?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const operatorId = (body.operatorId ?? "").trim();
  const name = (body.name ?? "").trim();
  if (!operatorId) return NextResponse.json({ ok: false, error: "Missing operatorId" }, { status: 400 });
  if (name.length < 2) return NextResponse.json({ ok: false, error: "Bus name is required" }, { status: 400 });

  const bus = await prisma.bus.create({
    data: { operatorId, name, active: true },
    select: { id: true, name: true, active: true },
  });

  return NextResponse.json({ ok: true, bus }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { busId?: string; active?: boolean; seatLayoutName?: string; layoutJson?: unknown };
  try {
    body = (await req.json()) as {
      busId?: string;
      active?: boolean;
      seatLayoutName?: string;
      layoutJson?: unknown;
    };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const busId = (body.busId ?? "").trim();
  if (!busId) return NextResponse.json({ ok: false, error: "Missing busId" }, { status: 400 });

  if (typeof body.active === "boolean") {
    const bus = await prisma.bus.update({
      where: { id: busId },
      data: { active: body.active },
      select: { id: true, active: true },
    });
    return NextResponse.json({ ok: true, bus });
  }

  // Seat layout update (JSON stored as-is; the visualiser will validate at runtime)
  if (body.layoutJson == null || typeof body.layoutJson !== "object") {
    return NextResponse.json({ ok: false, error: "layoutJson must be an object" }, { status: 400 });
  }

  const seatLayoutName = (body.seatLayoutName ?? "Seat Layout").trim() || "Seat Layout";

  const seatLayout = await prisma.busSeatLayout.upsert({
    where: { busId },
    update: { name: seatLayoutName, layoutJson: body.layoutJson as object },
    create: { busId, name: seatLayoutName, layoutJson: body.layoutJson as object },
    select: { id: true, name: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, seatLayout });
}

