"use client";

import { useEffect, useState } from "react";

type RouteRow = { id: string; fromCity: string; toCity: string };
type BusRow = { id: string; name: string; operator: { name: string }; seatLayout: { id: string } | null };
type TripRow = {
  id: string;
  journeyDate: string;
  departureTime: string;
  fare: number;
  busType: string;
  active: boolean;
  route: { id: string; fromCity: string; toCity: string };
  bus: { id: string; name: string; operator: { name: string } };
};

export default function ControlBusTripsPage() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [routeId, setRouteId] = useState("");
  const [busId, setBusId] = useState("");
  const [journeyDate, setJourneyDate] = useState("");
  const [departureTime, setDepartureTime] = useState("09:00");
  const [fare, setFare] = useState<number>(700);
  const [busType, setBusType] = useState("AC");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/bus/trips");
    const data = (await res.json().catch(() => null)) as
      | { ok: true; trips: TripRow[]; routes: RouteRow[]; buses: BusRow[] }
      | { ok: false; error: string }
      | null;
    if (!data || !data.ok) {
      setError(data?.error ?? "Failed to load trips.");
      return;
    }
    setTrips(data.trips);
    setRoutes(data.routes);
    setBuses(data.buses);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addTrip(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/bus/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routeId, busId, journeyDate, departureTime, fare, busType }),
    });
    setLoading(false);
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to add trip.");
      return;
    }
    await load();
  }

  async function toggleActive(t: TripRow) {
    const res = await fetch("/api/admin/bus/trips", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, active: !t.active }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to update trip.");
      return;
    }
    await load();
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Bus Trips</h1>
      <p className="mt-2 text-[var(--muted)]">Schedule intercity trips (creates seat state rows from the bus layout).</p>

      <form
        onSubmit={addTrip}
        className="mt-6 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 lg:grid-cols-6"
      >
        <div className="lg:col-span-2">
          <label className="text-sm font-medium">Route</label>
          <select
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            required
          >
            <option value="">Select</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fromCity} → {r.toCity}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="text-sm font-medium">Bus</label>
          <select
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={busId}
            onChange={(e) => setBusId(e.target.value)}
            required
          >
            <option value="">Select</option>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.operator.name} — {b.name} {b.seatLayout ? "" : "(no layout)"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Date</label>
          <input
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            type="date"
            value={journeyDate}
            onChange={(e) => setJourneyDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Time</label>
          <input
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Fare</label>
          <input
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            type="number"
            min={0}
            value={fare}
            onChange={(e) => setFare(Number(e.target.value))}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Type</label>
          <input
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={busType}
            onChange={(e) => setBusType(e.target.value)}
          />
        </div>

        <div className="lg:col-span-6">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create trip"}
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
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Bus</th>
              <th className="px-4 py-3">Fare</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id} className="border-b border-[var(--border)] last:border-b-0">
                <td className="px-4 py-3">
                  {t.route.fromCity} → {t.route.toCity}
                </td>
                <td className="px-4 py-3">{String(t.journeyDate).slice(0, 10)}</td>
                <td className="px-4 py-3">{String(t.departureTime).slice(11, 16)}</td>
                <td className="px-4 py-3">
                  {t.bus.operator.name} — {t.bus.name}
                </td>
                <td className="px-4 py-3 font-semibold">{t.fare} BDT</td>
                <td className="px-4 py-3">
                  {t.active ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-700">Active</span>
                  ) : (
                    <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs text-red-700">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleActive(t)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--card)]"
                  >
                    {t.active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
            {trips.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={7}>
                  No trips yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

