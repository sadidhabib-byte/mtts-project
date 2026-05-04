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

  const stations = await prisma.trainStation.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      district: true,
      active: true,
      updatedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ ok: true, stations });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; district?: string };
  try {
    body = (await req.json()) as { name?: string; district?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = normName(body.name);
  const district = normName(body.district);
  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "Station name is required." }, { status: 400 });
  }

  const station = await prisma.trainStation.upsert({
    where: { name },
    update: { active: true, district: district || null },
    create: { name, district: district || null, active: true },
    select: { id: true, name: true, district: true, active: true },
  });

  return NextResponse.json({ ok: true, station }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; active?: boolean; name?: string; district?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const id = (body.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const data: { active?: boolean; name?: string; district?: string | null } = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.name === "string") {
    const name = normName(body.name);
    if (name.length < 2) {
      return NextResponse.json({ ok: false, error: "Station name is required." }, { status: 400 });
    }
    data.name = name;
  }
  if (typeof body.district === "string") {
    const d = normName(body.district);
    data.district = d || null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
  }

  const station = await prisma.trainStation.update({
    where: { id },
    data,
    select: { id: true, name: true, district: true, active: true },
  });
  return NextResponse.json({ ok: true, station });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = (url.searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const refCount = await prisma.train.count({
    where: { OR: [{ startStationId: id }, { endStationId: id }] },
  });
  if (refCount > 0) {
    return NextResponse.json(
      { ok: false, error: "This station is used by trains. Disable it instead of deleting." },
      { status: 409 },
    );
  }

  await prisma.trainStation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
