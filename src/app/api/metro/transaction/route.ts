import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.sub;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const transactionId = (url.searchParams.get("transactionId") ?? "").trim();
  if (!transactionId) {
    return NextResponse.json({ ok: false, error: "Missing transactionId" }, { status: 400 });
  }

  const txn = await prisma.transaction.findFirst({
    where: { transactionId, userId },
    include: {
      startStation: { select: { name: true } },
      endStation: { select: { name: true } },
    },
  });

  if (!txn) {
    return NextResponse.json({ ok: false, error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    transaction: {
      transactionId: txn.transactionId,
      startStation: txn.startStation.name,
      endStation: txn.endStation.name,
      fare: txn.fare,
      createdAt: txn.createdAt.toISOString(),
      validTill: txn.validTill.toISOString(),
    },
  });
}

