"use client";

import { useEffect, useState } from "react";

type StationRow = {
  id: string;
  name: string;
  district: string | null;
  active: boolean;
};

export default function ControlTrainStationsPage() {
  const [stations, setStations] = useState<StationRow[]>([]);
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/train/stations");
    const data = (await res.json().catch(() => null)) as
      | { ok: true; stations: StationRow[] }
      | { ok: false; error: string }
      | null;
    if (!data || !data.ok) {
      setError(data?.error ?? "Failed to load stations.");
      return;
    }
    setStations(data.stations);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addStation(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/train/stations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, district }),
    });
    setLoading(false);
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to add station.");
      return;
    }
    setName("");
    setDistrict("");
    await load();
  }

  async function toggleActive(s: StationRow) {
    setError(null);
    const res = await fetch("/api/admin/train/stations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, active: !s.active }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to update station.");
      return;
    }
    await load();
  }

  async function deleteStation(s: StationRow) {
    setError(null);
    const res = await fetch(`/api/admin/train/stations?id=${encodeURIComponent(s.id)}`, {
      method: "DELETE",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to delete station.");
      return;
    }
    await load();
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Train Stations</h1>
      <p className="mt-2 text-[var(--muted)]">
        Add stations used by trains. Disable instead of deleting if any train references them.
      </p>

      <form
        onSubmit={addStation}
        className="mt-6 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:grid-cols-3"
      >
        <div>
          <label className="text-sm font-medium">Name</label>
          <input
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 outline-none"
            placeholder="Dhaka Railway Station"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">District (optional)</label>
          <input
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 outline-none"
            placeholder="Dhaka"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Adding..." : "Add station"}
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
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">District</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((s) => (
              <tr key={s.id} className="border-b border-[var(--border)] last:border-b-0">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{s.district || "—"}</td>
                <td className="px-4 py-3">
                  {s.active ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-700">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs text-red-700">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(s)}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--card)]"
                    >
                      {s.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStation(s)}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-700 hover:bg-red-500/15"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {stations.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={4}>
                  No stations yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
