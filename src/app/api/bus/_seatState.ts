import { prisma } from "@/lib/prisma";

export async function releaseExpiredBusHolds(now = new Date()) {
  // Release seats
  await prisma.busTripSeatState.updateMany({
    where: { state: "HELD", expiresAt: { lt: now } },
    data: { state: "AVAILABLE", holdId: null, expiresAt: null },
  });
  // Best-effort cleanup holds (does not need to be perfectly consistent)
  await prisma.busSeatHold.deleteMany({ where: { expiresAt: { lt: now } } });
}

