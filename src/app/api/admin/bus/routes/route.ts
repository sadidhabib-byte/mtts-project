import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/_auth";

export const runtime = "nodejs";

function normCity(s: unknown) {
  return typeof s === "string" ? s.trim().replace(/\s+/g, " ") : "";
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const routes = await prisma.busRoute.findMany({
    orderBy: [{ fromCity: "asc" }, { toCity: "asc" }],
    select: { id: true, fromCity: true, toCity: true, active: true, updatedAt: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, routes });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { fromCity?: string; toCity?: string };
  try {
    body = (await req.json()) as { fromCity?: string; toCity?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const fromCity = normCity(body.fromCity);
  const toCity = normCity(body.toCity);
  if (fromCity.length < 2 || toCity.length < 2) {
    return NextResponse.json({ ok: false, error: "From/To city is required." }, { status: 400 });
  }
  if (fromCity.toLowerCase() === toCity.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "From and To cannot be the same." }, { status: 400 });
  }

  // Mirror the reference project + metro fare symmetry: create both directions.
  const [a, b] = await prisma.$transaction([
    prisma.busRoute.upsert({
      where: { fromCity_toCity: { fromCity, toCity } },
      update: { active: true },
      create: { fromCity, toCity, active: true },
      select: { id: true, fromCity: true, toCity: true, active: true },
    }),
    prisma.busRoute.upsert({
      where: { fromCity_toCity: { fromCity: toCity, toCity: fromCity } },
      update: { active: true },
      create: { fromCity: toCity, toCity: fromCity, active: true },
      select: { id: true, fromCity: true, toCity: true, active: true },
    }),
  ]);

  return NextResponse.json({ ok: true, routes: [a, b] }, { status: 201 });
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
  if (typeof body.active !== "boolean") {
    return NextResponse.json({ ok: false, error: "Missing active flag" }, { status: 400 });
  }

  const route = await prisma.busRoute.update({
    where: { id },
    data: { active: body.active },
    select: { id: true, fromCity: true, toCity: true, active: true },
  });

  return NextResponse.json({ ok: true, route });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = (url.searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const tripCount = await prisma.busTrip.count({ where: { routeId: id } });
  if (tripCount > 0) {
    return NextResponse.json(
      { ok: false, error: "This route has trips. Disable it instead of deleting." },
      { status: 409 },
    );
  }

  await prisma.busRoute.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

