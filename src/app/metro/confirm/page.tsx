"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadTripDraft } from "@/lib/tripStore";

export default function MetroConfirmPage() {
  const router = useRouter();
  const [trip, setTrip] = useState<ReturnType<typeof loadTripDraft>>(null);

  useEffect(() => {
    const t = loadTripDraft();
    setTrip(t);
    if (!t) router.replace("/metro");
  }, [router]);

  if (!trip) return null;

  return (
    <div className="relative flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.35),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.25),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/30" />

      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur md:p-10">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-white">
          Confirm Ticket
        </h1>

        <div className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-white/90">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-white/70">Start</span>
            <span className="font-medium">{trip.startStation}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-white/70">End</span>
            <span className="font-medium">{trip.endStation}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-white/70">Fare</span>
            <span className="font-semibold">{trip.fare} BDT</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Link
            href="/checkout"
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-400 hover:to-sky-400"
          >
            Proceed to Payment
          </Link>
          <Link
            href="/metro"
            className="rounded-xl bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/15"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}

