import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const stations = await prisma.trainStation.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, district: true },
  });
  return NextResponse.json({ ok: true, stations });
}
