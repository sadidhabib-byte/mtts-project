"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type SeatState = {
  seatCode: string;
  state: "AVAILABLE" | "HELD" | "BOOKED";
  isMine: boolean;
  expiresAt: string | null;
};

type SeatCell = { t: "seat" | "aisle" | "empty"; code?: string };
type LayoutJson = { v?: number; rows?: number; cols?: number; cells?: SeatCell[][] };

export function BusSeatsClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const tripId = sp.get("tripId") ?? "";

  const [layout, setLayout] = useState<LayoutJson | null>(null);
  const [trip, setTrip] = useState<any>(null);
  const [states, setStates] = useState<SeatState[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);

  async function load() {
    setError(null);
    if (!tripId) {
      setError("Missing tripId");
      return;
    }
    const res = await fetch(`/api/bus/seats?tripId=${encodeURIComponent(tripId)}`);
    const data = (await res.json().catch(() => null)) as any;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to load seat map.");
      return;
    }
    setTrip(data.trip);
    setLayout(data.layout as LayoutJson);
    setStates(data.seatStates as SeatState[]);
    const my = (data.seatStates as SeatState[]).filter((s) => s.isMine).map((s) => s.seatCode);
    if (my.length > 0) setSelected(my);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const stateByCode = useMemo(() => new Map(states.map((s) => [s.seatCode, s])), [states]);

  function toggleSeat(code: string) {
    const s = stateByCode.get(code);
    if (!s) return;
    if (s.state === "BOOKED") return;
    if (s.state === "HELD" && !s.isMine) return;

    setSelected((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]));
  }

  async function holdAndCheckout() {
    if (!tripId) return;
    setError(null);
    setHolding(true);
    const res = await fetch("/api/bus/holds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId, seatCodes: selected }),
    });
    setHolding(false);
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to hold seats.");
      return;
    }
    router.push("/bus/checkout");
  }

  const cells = layout?.cells ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Select seats</h1>
          {trip ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              {trip.fromCity} → {trip.toCity} · {trip.journeyDate} {trip.departureTime} · {trip.busName} · Fare{" "}
              <span className="font-semibold text-[var(--foreground)]">{trip.fare} BDT</span> / seat
            </p>
          ) : null}
        </div>
        <Link href="/bus" className="text-sm text-[var(--muted)] hover:underline">
          Change trip
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">{error}</div>
      ) : null}

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="mb-4 text-sm font-semibold">Front</div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${layout?.cols ?? 1}, minmax(0,1fr))` }}>
          {cells.flatMap((row, rIdx) =>
            row.map((cell, cIdx) => {
              if (cell.t === "aisle") {
                return <div key={`${rIdx}-${cIdx}`} className="rounded-lg bg-[var(--background)]/50" />;
              }
              if (cell.t === "empty") {
                return <div key={`${rIdx}-${cIdx}`} />;
              }
              const code = cell.code ?? "";
              const s = stateByCode.get(code);
              const isSelected = selected.includes(code);
              const disabled = !s || s.state === "BOOKED" || (s.state === "HELD" && !s.isMine);
              const base =
                s?.state === "BOOKED"
                  ? "bg-red-500/15 text-red-700 border-red-500/20"
                  : s?.state === "HELD" && !s.isMine
                    ? "bg-amber-500/15 text-amber-800 border-amber-500/20"
                    : isSelected
                      ? "bg-emerald-500/20 text-emerald-800 border-emerald-500/30"
                      : "bg-[var(--background)] text-[var(--foreground)] border-[var(--border)]";
              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleSeat(code)}
                  className={`h-12 rounded-xl border text-xs font-semibold ${base} disabled:opacity-60`}
                >
                  {code}
                </button>
              );
            }),
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[var(--muted)]">
            Selected: <span className="font-semibold text-[var(--foreground)]">{selected.join(", ") || "None"}</span>{" "}
            · Total:{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {trip ? selected.length * Number(trip.fare) : 0} BDT
            </span>
          </div>
          <button
            type="button"
            onClick={holdAndCheckout}
            disabled={selected.length === 0 || holding}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {holding ? "Holding..." : "Hold seats & continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

