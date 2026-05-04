import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { releaseExpiredTrainHolds } from "@/app/api/train/_seatState";

export const runtime = "nodejs";

type Body = {
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

function randomRef() {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "trn_";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function POST(req: NextRequest) {
  await releaseExpiredTrainHolds();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.sub;
  if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const method = body.method ?? "";
  const accountNumber = (body.accountNumber ?? "").trim();
  const pin = (body.pin ?? "").trim();

  if (method !== "bkash" && method !== "rocket" && method !== "card") {
    return NextResponse.json({ ok: false, error: "Invalid payment method." }, { status: 400 });
  }
  if (!accountNumber || !pin) {
    return NextResponse.json({ ok: false, error: "Payment details are required." }, { status: 400 });
  }

  const pool = demoAccounts[method];
  const account = pool.find((a) => a.accountNumber === accountNumber && a.pin === pin);
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

  const now = new Date();
  const hold = await prisma.trainSeatHold.findFirst({
    where: { userId, expiresAt: { gt: now } },
    orderBy: { expiresAt: "desc" },
    select: { id: true, trainId: true, journeyDate: true, expiresAt: true },
  });
  if (!hold) return NextResponse.json({ ok: false, error: "No active seat hold." }, { status: 409 });

  const train = await prisma.train.findUnique({
    where: { id: hold.trainId },
    select: { fare: true, departureTime: true },
  });
  if (!train) return NextResponse.json({ ok: false, error: "Train not found." }, { status: 404 });

  const heldSeats = await prisma.trainSeatState.findMany({
    where: { holdId: hold.id, state: "HELD" },
    orderBy: [{ compartmentId: "asc" }, { seatNumber: "asc" }],
    select: { compartmentId: true, seatNumber: true },
  });
  if (heldSeats.length < 1) {
    return NextResponse.json({ ok: false, error: "Hold has no seats." }, { status: 409 });
  }

  const amount = heldSeats.length * train.fare;
  if (account.balance < amount) {
    return NextResponse.json({ ok: false, error: "Insufficient demo balance." }, { status: 400 });
  }

  const bookingRef = randomRef();

  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.trainBooking.create({
      data: {
        bookingRef,
        userId,
        trainId: hold.trainId,
        journeyDate: hold.journeyDate,
        departureTime: train.departureTime,
        amount,
        paymentMethod: method,
        status: "CONFIRMED",
        confirmedAt: now,
      },
      select: { id: true, bookingRef: true },
    });

    await tx.trainBookingSeat.createMany({
      data: heldSeats.map((s) => ({
        bookingId: b.id,
        trainId: hold.trainId,
        compartmentId: s.compartmentId,
        seatNumber: s.seatNumber,
      })),
      skipDuplicates: true,
    });

    await tx.trainSeatState.updateMany({
      where: { holdId: hold.id, state: "HELD" },
      data: { state: "BOOKED", holdId: null, bookingId: b.id, expiresAt: null },
    });

    await tx.trainSeatHold.delete({ where: { id: hold.id } });
    return b;
  });

  return NextResponse.json({ ok: true, bookingRef: booking.bookingRef });
}
