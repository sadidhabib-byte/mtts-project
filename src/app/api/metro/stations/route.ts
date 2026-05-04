import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fareTable from "@/data/metroFareTable.json";

export const runtime = "nodejs";

export async function GET() {
  const dbStations = await prisma.metroStation.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { name: true },
  });

  if (dbStations.length > 0) {
    return NextResponse.json({ stations: dbStations.map((s) => s.name) });
  }

  return NextResponse.json({ stations: fareTable.stations.slice() });
}

