import { prisma } from "@/lib/prisma";

export async function releaseExpiredTrainHolds(now = new Date()) {
  // Release seats
  await prisma.trainSeatState.updateMany({
    where: { state: "HELD", expiresAt: { lt: now } },
    data: { state: "AVAILABLE", holdId: null, expiresAt: null },
  });
  // Best-effort cleanup of expired hold rows (does not need to be perfectly consistent)
  await prisma.trainSeatHold.deleteMany({ where: { expiresAt: { lt: now } } });
}

/**
 * Lazily creates AVAILABLE TrainSeatState rows (1..totalSeats) for a given
 * (train, journeyDate, compartment) tuple. Idempotent via skipDuplicates on the
 * unique (trainId, journeyDate, compartmentId, seatNumber) index.
 */
export async function ensureSeatStates(params: {
  trainId: string;
  compartmentId: string;
  journeyDate: Date;
  totalSeats: number;
}) {
  const { trainId, compartmentId, journeyDate, totalSeats } = params;
  if (totalSeats < 1) return;
  const data = Array.from({ length: totalSeats }, (_, i) => ({
    trainId,
    compartmentId,
    journeyDate,
    seatNumber: i + 1,
    state: "AVAILABLE" as const,
  }));
  await prisma.trainSeatState.createMany({ data, skipDuplicates: true });
}

/**
 * Parses YYYY-MM-DD into a UTC Date-only value. Returns null if invalid.
 */
export function parseJourneyDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
