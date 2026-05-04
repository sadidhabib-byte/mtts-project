"use client";

import { useEffect, useState } from "react";

type RouteRow = { id: string; fromCity: string; toCity: string; active: boolean };

export default function ControlBusRoutesPage() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/bus/routes");
    const data = (await res.json().catch(() => null)) as
      | { ok: true; routes: RouteRow[] }
      | { ok: false; error: string }
      | null;
    if (!data || !data.ok) {
      setError(data?.error ?? "Failed to load routes.");
      return;
    }
    setRoutes(data.routes);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addRoute(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/bus/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromCity, toCity }),
    });
    setLoading(false);
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to add route.");
      return;
    }
    setFromCity("");
    setToCity("");
    await load();
  }

  async function toggleActive(r: RouteRow) {
    setError(null);
    const res = await fetch("/api/admin/bus/routes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, active: !r.active }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to update route.");
      return;
    }
    await load();
  }

  async function deleteRoute(r: RouteRow) {
    setError(null);
    const res = await fetch(`/api/admin/bus/routes?id=${encodeURIComponent(r.id)}`, {
      method: "DELETE",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to delete route.");
      return;
    }
    await load();
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Bus Routes</h1>
      <p className="mt-2 text-[var(--muted)]">Create intercity routes (both directions are created automatically).</p>

      <form
        onSubmit={addRoute}
        className="mt-6 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:grid-cols-3"
      >
        <div>
          <label className="text-sm font-medium">From</label>
          <input
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 outline-none"
            placeholder="Dhaka"
            value={fromCity}
            onChange={(e) => setFromCity(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">To</label>
          <input
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 outline-none"
            placeholder="Chattogram"
            value={toCity}
            onChange={(e) => setToCity(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Adding..." : "Add route"}
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
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((r) => (
              <tr key={r.id} className="border-b border-[var(--border)] last:border-b-0">
                <td className="px-4 py-3 font-medium">{r.fromCity}</td>
                <td className="px-4 py-3 font-medium">{r.toCity}</td>
                <td className="px-4 py-3">
                  {r.active ? (
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
                      onClick={() => toggleActive(r)}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--card)]"
                    >
                      {r.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRoute(r)}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-700 hover:bg-red-500/15"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {routes.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={4}>
                  No routes yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

