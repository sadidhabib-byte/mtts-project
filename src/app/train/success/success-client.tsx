"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function TrainSuccessClient() {
  const sp = useSearchParams();
  const bookingRef = sp.get("bookingRef") ?? "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Booking Confirmed</h1>
        <p className="mt-3 text-[var(--muted)]">Your train seats have been booked successfully.</p>

        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-5 py-4 text-left">
          <div className="text-xs text-[var(--muted)]">Booking reference</div>
          <div className="mt-1 font-mono text-sm font-semibold">{bookingRef || "—"}</div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/train"
            className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Book another trip
          </Link>
          <Link
            href="/profile"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-semibold hover:opacity-90"
          >
            Go to profile
          </Link>
        </div>
      </div>
    </div>
  );
}
