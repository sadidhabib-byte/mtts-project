import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { calculateFare } from "@/lib/metroFare";

export const runtime = "nodejs";

type Body = {
  startStation?: string;
  endStation?: string;
  fare?: number;
  method?: "bkash" | "rocket" | "card";
  accountNumber?: string;
  pin?: string;
  cardExpiry?: string;
};

const demoAccounts = {
  bkash: [
    { accountNumber: "01700000000", pin: "1234", balance: 5000 },
    { accountNumber: "01800000000", pin: "1234", balance: 200 },
  ],
  rocket: [{ accountNumber: "01900000000", pin: "1234", balance: 5000 }],
  card: [{ accountNumber: "4111111111111111", pin: "123", balance: 5000 }],
} as const;

function randomTxnId() {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "txn_";
  for (let i = 0; i < 7; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function ensureStation(name: string) {
  return prisma.metroStation.upsert({
    where: { name },
    update: {},
    create: { name, active: true },
    select: { id: true, name: true },
  });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.sub;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const startStation = (body.startStation ?? "").trim();
  const endStation = (body.endStation ?? "").trim();
  const method = body.method ?? "";
  const accountNumber = (body.accountNumber ?? "").trim();
  const pin = (body.pin ?? "").trim();

  if (!startStation || !endStation) {
    return NextResponse.json({ ok: false, error: "Missing trip details." }, { status: 400 });
  }
  if (startStation === endStation) {
    return NextResponse.json(
      { ok: false, error: "Start and end stations cannot be the same." },
      { status: 400 },
    );
  }
  if (method !== "bkash" && method !== "rocket" && method !== "card") {
    return NextResponse.json({ ok: false, error: "Invalid payment method." }, { status: 400 });
  }
  if (!accountNumber || !pin) {
    return NextResponse.json({ ok: false, error: "Payment details are required." }, { status: 400 });
  }

  const computedFare = calculateFare(startStation, endStation);
  if (computedFare == null) {
    return NextResponse.json(
      { ok: false, error: "Fare not found for this route." },
      { status: 400 },
    );
  }
  if (typeof body.fare === "number" && body.fare !== computedFare) {
    return NextResponse.json({ ok: false, error: "Fare mismatch." }, { status: 400 });
  }

  const pool = demoAccounts[method];
  const account = pool.find(
    (a) => a.accountNumber === accountNumber && a.pin === pin,
  );
  if (!account) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid demo account details. Try bkash 01700000000 / 1234 or card 4111111111111111 / 123.",
      },
      { status: 400 },
    );
  }
  if (account.balance < computedFare) {
    return NextResponse.json(
      { ok: false, error: "Insufficient demo balance." },
      { status: 400 },
    );
  }

  // Simulated payment success (stored in DB)
  const transactionId = randomTxnId();
  const createdAt = new Date();
  const validTill = new Date(createdAt.getTime() + 8 * 60 * 60 * 1000);

  const start = await ensureStation(startStation);
  const end = await ensureStation(endStation);

  await prisma.transaction.create({
    data: {
      transactionId,
      userId,
      startStationId: start.id,
      endStationId: end.id,
      fare: computedFare,
      paymentMethod: method,
      validTill,
    },
  });

  return NextResponse.json({ ok: true, transactionId });
}

