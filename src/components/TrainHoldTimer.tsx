"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type HoldSeat = { compartmentId: string; compartmentName: string; seatNumber: number };
type Hold = {
  id: string;
  trainId: string;
  journeyDate: string;
  expiresAt: string;
  seats: HoldSeat[];
  train: {
    id: string;
    name: string;
    fare: number;
    departureTime: string;
    fromStation: string;
    toStation: string;
  } | null;
};

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function TrainHoldTimer() {
  const pathname = usePathname();
  const [hold, setHold] = useState<Hold | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch("/api/train/hold").catch(() => null);
      if (res?.status === 401) {
        setHold(null);
        return;
      }
      const data = res ? ((await res.json().catch(() => null)) as { ok?: boolean; hold?: Hold | null }) : null;
      if (cancelled) return;
      if (!data?.ok) {
        setHold(null);
        return;
      }
      setHold(data.hold ?? null);
    }
    void poll();
    const t = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const remainingMs = useMemo(
    () => (hold ? new Date(hold.expiresAt).getTime() - now : 0),
    [hold, now],
  );
  const visible = !!hold && remainingMs > 0;
  const onCheckout = pathname.startsWith("/train/checkout");

  async function cancelHold() {
    await fetch("/api/train/holds/cancel", { method: "POST" }).catch(() => {});
    setHold(null);
  }

  if (!visible || !hold) return null;

  const seatsByCoach = new Map<string, number[]>();
  for (const s of hold.seats) {
    const arr = seatsByCoach.get(s.compartmentName) ?? [];
    arr.push(s.seatNumber);
    seatsByCoach.set(s.compartmentName, arr);
  }
  const seatSummary = Array.from(seatsByCoach.entries())
    .map(([cname, arr]) => `${cname}: ${arr.sort((a, b) => a - b).join(", ")}`)
    .join("  ·  ");

  return (
    <div className="w-[320px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Train seat hold active</div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Expires in{" "}
            <span className="font-semibold text-[var(--foreground)]">{formatMs(remainingMs)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={cancelHold}
          className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs hover:opacity-90"
        >
          Cancel
        </button>
      </div>

      <div className="mt-3 text-xs text-[var(--muted)]">Seats: {seatSummary || "—"}</div>

      {!onCheckout ? (
        <div className="mt-4">
          <Link
            href="/train/checkout"
            className="block rounded-xl bg-zinc-900 px-4 py-2 text-center text-xs font-semibold text-white hover:bg-zinc-800"
          >
            Continue to payment
          </Link>
        </div>
      ) : null}
    </div>
  );
}
