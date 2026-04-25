import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/_auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const stations = await prisma.metroStation.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, active: true },
  });
  return NextResponse.json({ ok: true, stations });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { name?: string };
  try {
    body = (await req.json()) as { name?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "Station name is required." }, { status: 400 });
  }

  const station = await prisma.metroStation.create({
    data: { name, active: true },
    select: { id: true, name: true, active: true },
  });
  return NextResponse.json({ ok: true, station }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; active?: boolean; name?: string };
  try {
    body = (await req.json()) as { id?: string; active?: boolean; name?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const id = (body.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const data: { active?: boolean; name?: string } = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.name === "string" && body.name.trim().length >= 2) data.name = body.name.trim();

  const station = await prisma.metroStation.update({
    where: { id },
    data,
    select: { id: true, name: true, active: true },
  });

  return NextResponse.json({ ok: true, station });
}

