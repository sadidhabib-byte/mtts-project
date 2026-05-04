import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { releaseExpiredBusHolds } from "@/app/api/bus/_seatState";

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
  let s = "bus_";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function POST(req: NextRequest) {
  await releaseExpiredBusHolds();

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
  const hold = await prisma.busSeatHold.findFirst({
    where: { userId, expiresAt: { gt: now } },
    orderBy: { expiresAt: "desc" },
    select: { id: true, tripId: true, expiresAt: true },
  });
  if (!hold) return NextResponse.json({ ok: false, error: "No active seat hold." }, { status: 409 });

  const trip = await prisma.busTrip.findUnique({
    where: { id: hold.tripId },
    select: { fare: true },
  });
  if (!trip) return NextResponse.json({ ok: false, error: "Trip not found." }, { status: 404 });

  const heldSeats = await prisma.busTripSeatState.findMany({
    where: { tripId: hold.tripId, holdId: hold.id, state: "HELD" },
    select: { seatCode: true },
    orderBy: { seatCode: "asc" },
  });
  if (heldSeats.length < 1) return NextResponse.json({ ok: false, error: "Hold has no seats." }, { status: 409 });

  const amount = heldSeats.length * trip.fare;
  if (account.balance < amount) {
    return NextResponse.json({ ok: false, error: "Insufficient demo balance." }, { status: 400 });
  }

  const bookingRef = randomRef();

  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.busBooking.create({
      data: {
        bookingRef,
        userId,
        tripId: hold.tripId,
        amount,
        paymentMethod: method,
        status: "CONFIRMED",
        confirmedAt: now,
      },
      select: { id: true, bookingRef: true },
    });

    await tx.busBookingSeat.createMany({
      data: heldSeats.map((s) => ({ bookingId: b.id, tripId: hold.tripId, seatCode: s.seatCode })),
      skipDuplicates: true,
    });

    await tx.busTripSeatState.updateMany({
      where: { tripId: hold.tripId, holdId: hold.id, state: "HELD" },
      data: { state: "BOOKED", holdId: null, bookingId: b.id, expiresAt: null },
    });

    await tx.busSeatHold.delete({ where: { id: hold.id } });
    return b;
  });

  return NextResponse.json({ ok: true, bookingRef: booking.bookingRef });
}

