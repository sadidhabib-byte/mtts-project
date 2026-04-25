"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveTripDraft } from "@/lib/tripStore";

type FareResponse =
  | { ok: true; fare: number }
  | { ok: false; error: string };

export default function MetroPage() {
  const router = useRouter();
  const [stations, setStations] = useState<string[]>([]);
  const [startStation, setStartStation] = useState("");
  const [endStation, setEndStation] = useState("");
  const [fare, setFare] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingFare, setLoadingFare] = useState(false);

  useEffect(() => {
    fetch("/api/metro/stations")
      .then((r) => r.json())
      .then((d: { stations?: string[] }) => {
        const list = d.stations ?? [];
        setStations(list);
        // #region agent log
        fetch("/api/debug/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "b0b5df",
            runId: "pre-fix",
            hypothesisId: "H5",
            location: "src/app/metro/page.tsx:25",
            message: "Metro stations loaded",
            data: { count: list.length, sample: list.slice(0, 5) },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      })
      .catch(() => setStations([]));
  }, []);

  const stationsSet = useMemo(() => new Set(stations), [stations]);

  useEffect(() => {
    setError(null);
    setFare(null);

    if (!startStation || !endStation) return;
    if (startStation === endStation) {
      setError("Start and end stations cannot be the same.");
      return;
    }
    if (stations.length > 0 && (!stationsSet.has(startStation) || !stationsSet.has(endStation))) {
      return;
    }

    setLoadingFare(true);
    fetch("/api/metro/fare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startStation, endStation }),
    })
      .then((r) => r.json())
      .then((d: FareResponse) => {
        if (!d.ok) {
          setError(d.error);
          setFare(null);
          return;
        }
        setFare(d.fare);
      })
      .catch(() => setError("Unable to calculate fare right now."))
      .finally(() => setLoadingFare(false));
  }, [startStation, endStation, stations.length, stationsSet]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!startStation || !endStation) {
      setError("Please select start and end stations.");
      return;
    }
    if (startStation === endStation) {
      setError("Start and end stations cannot be the same.");
      return;
    }
    if (stations.length > 0 && (!stationsSet.has(startStation) || !stationsSet.has(endStation))) {
      setError("Please select valid stations from the list.");
      return;
    }
    if (fare == null) {
      setError("Fare is not calculated yet.");
      return;
    }

    saveTripDraft({ startStation, endStation, fare });
    router.push("/metro/confirm");
  }

  return (
    <div className="relative flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[url('/images/Metro_Ticket_Counter.jpg')] bg-cover bg-center" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.35),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.25),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[var(--glass-overlay)]" />

      <div className="w-full max-w-xl rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6 text-[var(--glass-fg)] shadow-2xl backdrop-blur md:p-10">
        <h1 className="text-center text-3xl font-semibold tracking-tight">
          Purchase Metro Ticket
        </h1>
        <p className="mt-2 text-center text-sm opacity-80">
          This ticket is valid for the next 8 hours since the purchase.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-medium opacity-90">Start location</label>
            <input
              className="mt-2 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-input-bg)] px-4 py-3 text-[var(--glass-input-fg)] outline-none placeholder:text-[var(--glass-input-placeholder)] focus:border-[color:var(--glass-border)]"
              placeholder="Type to search stations..."
              list="stations"
              value={startStation}
              onChange={(e) => setStartStation(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium opacity-90">End location</label>
            <input
              className="mt-2 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-input-bg)] px-4 py-3 text-[var(--glass-input-fg)] outline-none placeholder:text-[var(--glass-input-placeholder)] focus:border-[color:var(--glass-border)]"
              placeholder="Type to search stations..."
              list="stations"
              value={endStation}
              onChange={(e) => setEndStation(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <datalist id="stations">
            {stations.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>

          <div>
            <label className="text-sm font-medium opacity-90">Fare (BDT)</label>
            <input
              className="mt-2 w-full rounded-xl border border-[var(--glass-border)] bg-[color:var(--glass-input-bg)]/70 px-4 py-3 text-[var(--glass-input-fg)] outline-none opacity-90"
              value={
                loadingFare ? "Calculating..." : fare == null ? "" : String(fare)
              }
              readOnly
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-400 hover:to-sky-400"
          >
            Purchase Ticket
          </button>
        </form>
      </div>
    </div>
  );
}

