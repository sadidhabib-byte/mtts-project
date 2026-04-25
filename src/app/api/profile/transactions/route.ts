import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getUserSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const txns = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      startStation: { select: { name: true } },
      endStation: { select: { name: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    transactions: txns.map((t) => ({
      transactionId: t.transactionId,
      startStation: t.startStation.name,
      endStation: t.endStation.name,
      fare: t.fare,
      paymentMethod: t.paymentMethod,
      createdAt: t.createdAt.toISOString(),
      validTill: t.validTill.toISOString(),
    })),
  });
}

