"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type TrainInfo = {
  id: string;
  name: string;
  fromStation: string;
  toStation: string;
  departureTime: string;
  fare: number;
  journeyDate: string;
};

type CompartmentSummary = {
  id: string;
  name: string;
  totalSeats: number;
  available: number;
  held: number;
  booked: number;
};

type SeatState = {
  seatNumber: number;
  state: "AVAILABLE" | "HELD" | "BOOKED";
  isMine: boolean;
  expiresAt: string | null;
};

export function TrainSeatsClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const trainId = sp.get("trainId") ?? "";
  const journeyDate = sp.get("date") ?? "";

  const [train, setTrain] = useState<TrainInfo | null>(null);
  const [compartments, setCompartments] = useState<CompartmentSummary[]>([]);
  const [activeCompartment, setActiveCompartment] = useState<string>("");
  const [activeName, setActiveName] = useState<string>("");
  const [activeTotal, setActiveTotal] = useState<number>(0);
  const [seatStates, setSeatStates] = useState<SeatState[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);
  const [seatsLoading, setSeatsLoading] = useState(false);

  useEffect(() => {
    async function loadCompartments() {
      setError(null);
      if (!trainId || !journeyDate) {
        setError("Missing train or date.");
        return;
      }
      const qs = new URLSearchParams({ trainId, date: journeyDate });
      const res = await fetch(`/api/train/compartments?${qs.toString()}`);
      const data = (await res.json().catch(() => null)) as
        | { ok: true; train: TrainInfo; compartments: CompartmentSummary[] }
        | { ok: false; error: string }
        | null;
      if (!data || !data.ok) {
        setError(data?.error ?? "Failed to load compartments.");
        return;
      }
      setTrain(data.train);
      setCompartments(data.compartments);
      if (data.compartments.length > 0 && !activeCompartment) {
        setActiveCompartment(data.compartments[0].id);
      }
    }
    void loadCompartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainId, journeyDate]);

  useEffect(() => {
    async function loadSeats() {
      if (!trainId || !journeyDate || !activeCompartment) return;
      setSeatsLoading(true);
      setError(null);
      const qs = new URLSearchParams({
        trainId,
        date: journeyDate,
        compartmentId: activeCompartment,
      });
      const res = await fetch(`/api/train/seats?${qs.toString()}`);
      setSeatsLoading(false);
      const data = (await res.json().catch(() => null)) as
        | {
            ok: true;
            train: TrainInfo;
            compartment: { id: string; name: string; totalSeats: number };
            seatStates: SeatState[];
            myHold: { id: string } | null;
          }
        | { ok: false; error: string }
        | null;
      if (!data || !data.ok) {
        setError(data?.error ?? "Failed to load seats.");
        return;
      }
      setActiveName(data.compartment.name);
      setActiveTotal(data.compartment.totalSeats);
      setSeatStates(data.seatStates);
      // Pre-select my own held seats in this compartment, if any.
      const mine = data.seatStates.filter((s) => s.isMine).map((s) => s.seatNumber);
      setSelected(mine);
    }
    void loadSeats();
  }, [trainId, journeyDate, activeCompartment]);

  const stateByNumber = useMemo(
    () => new Map(seatStates.map((s) => [s.seatNumber, s])),
    [seatStates],
  );

  function toggleSeat(n: number) {
    const s = stateByNumber.get(n);
    if (!s) return;
    if (s.state === "BOOKED") return;
    if (s.state === "HELD" && !s.isMine) return;
    setSelected((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  async function holdAndCheckout() {
    if (!trainId || !activeCompartment || !journeyDate) return;
    if (selected.length < 1) return setError("Select at least one seat.");
    if (selected.length > 6) return setError("Max 6 seats per booking.");
    setHolding(true);
    setError(null);
    const res = await fetch("/api/train/holds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trainId,
        compartmentId: activeCompartment,
        journeyDate,
        seatNumbers: selected,
      }),
    });
    setHolding(false);
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to hold seats.");
      return;
    }
    router.push("/train/checkout");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Select seats</h1>
          {train ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              {train.fromStation} → {train.toStation} · {train.journeyDate} {train.departureTime} ·{" "}
              {train.name} · Fare{" "}
              <span className="font-semibold text-[var(--foreground)]">{train.fare} BDT</span> / seat
            </p>
          ) : null}
        </div>
        <Link href="/train" className="text-sm text-[var(--muted)] hover:underline">
          Change train
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">{error}</div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="text-sm font-semibold">Choose a compartment</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {compartments.map((c) => {
            const active = c.id === activeCompartment;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCompartment(c.id)}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  active
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-800"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:opacity-90",
                ].join(" ")}
              >
                <div>{c.name}</div>
                <div className="mt-0.5 text-[10px] font-normal text-[var(--muted)]">
                  {c.available}/{c.totalSeats} available
                </div>
              </button>
            );
          })}
          {compartments.length === 0 ? (
            <div className="text-sm text-[var(--muted)]">No compartments configured.</div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="mb-4 flex items-center justify-between text-sm">
          <div>
            <div className="font-semibold">Compartment {activeName || "—"}</div>
            <div className="mt-0.5 text-xs text-[var(--muted)]">Front of compartment</div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded-sm border border-[var(--border)] bg-[var(--background)]" />
              Available
            </span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded-sm border border-emerald-500/30 bg-emerald-500/20" />
              Selected
            </span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded-sm border border-amber-500/20 bg-amber-500/15" />
              Held
            </span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded-sm border border-red-500/20 bg-red-500/15" />
              Booked
            </span>
          </div>
        </div>

        {seatsLoading ? (
          <div className="text-sm text-[var(--muted)]">Loading seats...</div>
        ) : (
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {Array.from({ length: activeTotal }, (_, i) => i + 1).map((n) => {
              const s = stateByNumber.get(n);
              const isSelected = selected.includes(n);
              const disabled = !s || s.state === "BOOKED" || (s.state === "HELD" && !s.isMine);
              const cls =
                s?.state === "BOOKED"
                  ? "bg-red-500/15 text-red-700 border-red-500/20"
                  : s?.state === "HELD" && !s.isMine
                    ? "bg-amber-500/15 text-amber-800 border-amber-500/20"
                    : isSelected
                      ? "bg-emerald-500/20 text-emerald-800 border-emerald-500/30"
                      : "bg-[var(--background)] text-[var(--foreground)] border-[var(--border)]";
              return (
                <button
                  key={n}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleSeat(n)}
                  className={`h-12 rounded-xl border text-xs font-semibold ${cls} disabled:opacity-60`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[var(--muted)]">
            Selected:{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {selected.length > 0 ? selected.sort((a, b) => a - b).join(", ") : "None"}
            </span>{" "}
            · Total:{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {train ? selected.length * Number(train.fare) : 0} BDT
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
