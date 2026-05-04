"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Station = { id: string; name: string; district: string | null };
type TrainRow = {
  id: string;
  name: string;
  departureTime: string;
  fare: number;
  fromStation: string;
  toStation: string;
  totalSeats: number;
  compartmentCount: number;
};

export default function TrainHomePage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [trains, setTrains] = useState<TrainRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetch("/api/train/stations")
      .then((r) => r.json())
      .then((d: { ok?: boolean; stations?: Station[] }) => setStations(d.stations ?? []))
      .catch(() => setStations([]));
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSearched(true);
    const qs = new URLSearchParams({ from: fromName, to: toName, date });
    const res = await fetch(`/api/train/trains?${qs.toString()}`);
    setLoading(false);
    const data = (await res.json().catch(() => null)) as
      | { ok: true; trains: TrainRow[] }
      | { ok: false; error: string }
      | null;
    if (!data || !data.ok) {
      setError(data?.error ?? "Failed to load trains.");
      setTrains([]);
      return;
    }
    setTrains(data.trains);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Train Tickets</h1>
      <p className="mt-2 text-[var(--muted)]">Choose stations + date to view scheduled trains.</p>

      <form
        onSubmit={search}
        className="mt-6 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:grid-cols-4"
      >
        <div>
          <label className="text-sm font-medium">From</label>
          <select
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={fromName}
            onChange={(e) => {
              setFromName(e.target.value);
              if (toName === e.target.value) setToName("");
            }}
            required
          >
            <option value="">Select</option>
            {stations.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">To</label>
          <select
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={toName}
            onChange={(e) => setToName(e.target.value)}
            required
          >
            <option value="">Select</option>
            {stations
              .filter((s) => s.name !== fromName)
              .map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
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
            {loading ? "Searching..." : "Search trains"}
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
              <th className="px-4 py-3">Train</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Fare</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {trains.map((t) => (
              <tr key={t.id} className="border-b border-[var(--border)] last:border-b-0">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {t.fromStation} → {t.toStation}
                </td>
                <td className="px-4 py-3">{t.departureTime}</td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {t.totalSeats} seats · {t.compartmentCount} coaches
                </td>
                <td className="px-4 py-3 font-semibold">{t.fare} BDT</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/train/seats?trainId=${encodeURIComponent(t.id)}&date=${encodeURIComponent(date)}`}
                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    Choose seats
                  </Link>
                </td>
              </tr>
            ))}
            {trains.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={6}>
                  {searched ? "No trains found. Try another route/date." : "Select stations and a date, then search."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
