"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type RouteRow = { id: string; fromCity: string; toCity: string };
type TripRow = {
  id: string;
  journeyDate: string;
  departureTime: string;
  fare: number;
  busType: string;
  bus: { name: string; operator: { name: string } };
};

export default function BusHomePage() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/bus/routes")
      .then((r) => r.json())
      .then((d: { ok?: boolean; routes?: RouteRow[] }) => setRoutes(d.routes ?? []))
      .catch(() => setRoutes([]));
  }, []);

  const fromOptions = useMemo(() => Array.from(new Set(routes.map((r) => r.fromCity))).sort(), [routes]);
  const toOptions = useMemo(
    () => Array.from(new Set(routes.filter((r) => r.fromCity === fromCity).map((r) => r.toCity))).sort(),
    [routes, fromCity],
  );

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const qs = new URLSearchParams({ from: fromCity, to: toCity, date });
    const res = await fetch(`/api/bus/trips?${qs.toString()}`);
    setLoading(false);
    const data = (await res.json().catch(() => null)) as
      | { ok: true; trips: TripRow[] }
      | { ok: false; error: string }
      | null;
    if (!data || !data.ok) {
      setError(data?.error ?? "Failed to load trips.");
      setTrips([]);
      return;
    }
    setTrips(data.trips);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Bus Tickets</h1>
      <p className="mt-2 text-[var(--muted)]">Choose route + date to view available trips.</p>

      <form
        onSubmit={search}
        className="mt-6 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:grid-cols-4"
      >
        <div>
          <label className="text-sm font-medium">From</label>
          <select
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={fromCity}
            onChange={(e) => {
              setFromCity(e.target.value);
              setToCity("");
            }}
            required
          >
            <option value="">Select</option>
            {fromOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">To</label>
          <select
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={toCity}
            onChange={(e) => setToCity(e.target.value)}
            required
          >
            <option value="">Select</option>
            {toOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Date</label>
          <input
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Searching..." : "Search trips"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">{error}</div>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Bus</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Fare</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id} className="border-b border-[var(--border)] last:border-b-0">
                <td className="px-4 py-3 font-medium">
                  {t.bus.operator.name} — {t.bus.name}
                </td>
                <td className="px-4 py-3">{String(t.departureTime).slice(11, 16)}</td>
                <td className="px-4 py-3">{t.busType}</td>
                <td className="px-4 py-3 font-semibold">{t.fare} BDT</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/bus/seats?tripId=${encodeURIComponent(t.id)}`}
                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    Choose seats
                  </Link>
                </td>
              </tr>
            ))}
            {trips.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={5}>
                  No trips found. Try another route/date.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

