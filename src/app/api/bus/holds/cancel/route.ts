import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { releaseExpiredBusHolds } from "@/app/api/bus/_seatState";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await releaseExpiredBusHolds();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.sub;
  if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const hold = await prisma.busSeatHold.findFirst({
    where: { userId, expiresAt: { gt: now } },
    orderBy: { expiresAt: "desc" },
    select: { id: true },
  });
  if (!hold) return NextResponse.json({ ok: true });

  await prisma.$transaction([
    prisma.busTripSeatState.updateMany({
      where: { holdId: hold.id, state: "HELD" },
      data: { state: "AVAILABLE", holdId: null, expiresAt: null },
    }),
    prisma.busSeatHold.delete({ where: { id: hold.id } }),
  ]);

  return NextResponse.json({ ok: true });
}

