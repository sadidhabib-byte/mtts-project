"use client";

import { useEffect, useMemo, useState } from "react";

type Operator = { id: string; name: string };
type Bus = {
  id: string;
  name: string;
  active: boolean;
  operator: { id: string; name: string };
  seatLayout: { id: string; name: string; layoutJson: unknown; updatedAt: string } | null;
};

function seatCountFromLayout(layoutJson: unknown) {
  const obj = layoutJson as { cells?: Array<Array<{ t?: string; code?: string }>> } | null;
  const cells = obj?.cells;
  if (!Array.isArray(cells)) return 0;
  let n = 0;
  for (const row of cells) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      if (cell?.t === "seat" && typeof cell.code === "string") n += 1;
    }
  }
  return n;
}

export default function ControlBusBusesPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>("");
  const [layoutText, setLayoutText] = useState<string>("");
  const [layoutName, setLayoutName] = useState<string>("Seat Layout");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/bus/buses");
    const data = (await res.json().catch(() => null)) as
      | { ok: true; operators: Operator[]; buses: Bus[] }
      | { ok: false; error: string }
      | null;
    if (!data || !data.ok) {
      setError(data?.error ?? "Failed to load buses.");
      return;
    }
    setOperators(data.operators);
    setBuses(data.buses);
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedBus = useMemo(
    () => buses.find((b) => b.id === selectedBusId) ?? null,
    [buses, selectedBusId],
  );

  useEffect(() => {
    if (!selectedBus) return;
    setLayoutName(selectedBus.seatLayout?.name ?? "Seat Layout");
    setLayoutText(
      JSON.stringify(
        selectedBus.seatLayout?.layoutJson ?? { v: 1, rows: 0, cols: 0, cells: [] },
        null,
        2,
      ),
    );
  }, [selectedBus?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveLayout() {
    if (!selectedBus) return;
    setSaving(true);
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(layoutText);
    } catch {
      setSaving(false);
      setError("Layout JSON is invalid.");
      return;
    }

    const res = await fetch("/api/admin/bus/buses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ busId: selectedBus.id, seatLayoutName: layoutName, layoutJson: parsed }),
    });
    setSaving(false);
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to save layout.");
      return;
    }
    await load();
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Buses & Seat Layouts</h1>
      <p className="mt-2 text-[var(--muted)]">Edit per-bus seat layout JSON (used by the seat visualiser).</p>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="text-sm font-semibold">Select bus</div>
          <select
            className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={selectedBusId}
            onChange={(e) => setSelectedBusId(e.target.value)}
          >
            <option value="">Choose…</option>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.operator.name} — {b.name}
              </option>
            ))}
          </select>

          {selectedBus ? (
            <div className="mt-4 text-sm text-[var(--muted)]">
              Seats in layout:{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {seatCountFromLayout(selectedBus.seatLayout?.layoutJson ?? null)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold">Seat layout JSON</div>
            <div className="flex items-center gap-2">
              <input
                className="w-56 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="Layout name"
                disabled={!selectedBus}
              />
              <button
                type="button"
                onClick={saveLayout}
                disabled={!selectedBus || saving}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <textarea
            className="mt-4 h-[420px] w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 font-mono text-xs outline-none"
            value={layoutText}
            onChange={(e) => setLayoutText(e.target.value)}
            disabled={!selectedBus}
          />
        </div>
      </div>
    </div>
  );
}

