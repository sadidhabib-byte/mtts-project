"use client";

import { useEffect, useState } from "react";

type Station = { id: string; name: string; active: boolean };

export default function ControlStationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/metro/stations");
    const data = (await res.json().catch(() => null)) as
      | { ok: true; stations: Station[] }
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
    const res = await fetch("/api/admin/metro/stations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to add station.");
      return;
    }
    setName("");
    await load();
  }

  async function toggleActive(st: Station) {
    const res = await fetch("/api/admin/metro/stations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: st.id, active: !st.active }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to update station.");
      return;
    }
    await load();
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Metro Stations</h1>
      <p className="mt-2 text-[var(--muted)]">Add stations and toggle active status.</p>

      <form onSubmit={addStation} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 outline-none"
          placeholder="New station name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "Adding..." : "Add station"}
        </button>
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
              <th className="px-4 py-3">Station</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((st) => (
              <tr key={st.id} className="border-b border-[var(--border)] last:border-b-0">
                <td className="px-4 py-3 font-medium">{st.name}</td>
                <td className="px-4 py-3">
                  {st.active ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-700">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs text-red-700">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(st)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--card)]"
                  >
                    {st.active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
            {stations.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={3}>
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

