import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const fromCity = (url.searchParams.get("from") ?? "").trim();
  const toCity = (url.searchParams.get("to") ?? "").trim();
  const date = (url.searchParams.get("date") ?? "").trim(); // YYYY-MM-DD

  if (!fromCity || !toCity || !date) {
    return NextResponse.json({ ok: false, error: "Missing from/to/date" }, { status: 400 });
  }

  const route = await prisma.busRoute.findUnique({
    where: { fromCity_toCity: { fromCity, toCity } },
    select: { id: true },
  });
  if (!route) return NextResponse.json({ ok: true, trips: [] });

  const trips = await prisma.busTrip.findMany({
    where: { routeId: route.id, journeyDate: new Date(date), active: true, bus: { active: true } },
    orderBy: { departureTime: "asc" },
    select: {
      id: true,
      journeyDate: true,
      departureTime: true,
      fare: true,
      busType: true,
      bus: { select: { name: true, operator: { select: { name: true } } } },
    },
  });

  return NextResponse.json({ ok: true, trips });
}

