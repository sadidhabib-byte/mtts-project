import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const routes = await prisma.busRoute.findMany({
    where: { active: true },
    orderBy: [{ fromCity: "asc" }, { toCity: "asc" }],
    select: { id: true, fromCity: true, toCity: true },
  });
  return NextResponse.json({ ok: true, routes });
}

