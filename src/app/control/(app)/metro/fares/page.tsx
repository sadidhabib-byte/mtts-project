"use client";

import { useEffect, useState } from "react";

type Station = { id: string; name: string };
type FareRow = {
  id: string;
  fare: number;
  fromStation: Station;
  toStation: Station;
};

export default function ControlFaresPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [fares, setFares] = useState<FareRow[]>([]);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [fare, setFare] = useState<number>(20);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingFare, setEditingFare] = useState<number>(0);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/metro/fares");
    const data = (await res.json().catch(() => null)) as
      | { ok: true; stations: Station[]; fares: FareRow[] }
      | { ok: false; error: string }
      | null;
    if (!data || !data.ok) {
      setError(data?.error ?? "Failed to load fares.");
      return;
    }
    setStations(data.stations);
    setFares(data.fares);
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateFare(fromStationId: string, toStationId: string, nextFare: number) {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/admin/metro/fares", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromStationId, toStationId, fare: nextFare }),
    });
    setLoading(false);
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to update fare.");
      return;
    }
    setEditingId(null);
    await load();
  }

  async function saveFare(e: React.FormEvent) {
    e.preventDefault();
    await updateFare(fromId, toId, fare);
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Metro Fares</h1>
      <p className="mt-2 text-[var(--muted)]">Edit fare between any two active stations.</p>

      <form
        onSubmit={saveFare}
        className="mt-6 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:grid-cols-4"
      >
        <div className="sm:col-span-1">
          <label className="text-sm font-medium">From</label>
          <select
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            required
          >
            <option value="">Select</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-1">
          <label className="text-sm font-medium">To</label>
          <select
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            required
          >
            <option value="">Select</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-1">
          <label className="text-sm font-medium">Fare (BDT)</label>
          <input
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            type="number"
            min={0}
            value={fare}
            onChange={(e) => setFare(Number(e.target.value))}
            required
          />
        </div>

        <div className="sm:col-span-1 flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save fare"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Fare</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {fares.map((f) => (
              <tr key={f.id} className="border-b border-[var(--border)] last:border-b-0">
                <td className="px-4 py-3">{f.fromStation.name}</td>
                <td className="px-4 py-3">{f.toStation.name}</td>
                <td className="px-4 py-3 font-semibold">
                  {editingId === f.id ? (
                    <input
                      className="w-24 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm outline-none"
                      type="number"
                      min={0}
                      value={editingFare}
                      onChange={(e) => setEditingFare(Number(e.target.value))}
                    />
                  ) : (
                    f.fare
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === f.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                        onClick={() => updateFare(f.fromStation.id, f.toStation.id, editingFare)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--card)] disabled:opacity-60"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--card)]"
                      onClick={() => {
                        setEditingId(f.id);
                        setEditingFare(f.fare);
                      }}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {fares.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={4}>
                  No fares yet. Add one above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">
        Tip: Keep fares symmetric (A→B equals B→A). The API updates both directions automatically.
      </p>
    </div>
  );
}

