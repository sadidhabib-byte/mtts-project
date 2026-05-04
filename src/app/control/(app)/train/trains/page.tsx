"use client";

import { useEffect, useMemo, useState } from "react";

type StationOpt = { id: string; name: string };
type Compartment = { id: string; name: string; totalSeats: number };
type TrainRow = {
  id: string;
  name: string;
  fare: number;
  departureTime: string; // HH:MM
  active: boolean;
  startStation: StationOpt;
  endStation: StationOpt;
  compartments: Compartment[];
};

export default function ControlTrainTrainsPage() {
  const [trains, setTrains] = useState<TrainRow[]>([]);
  const [stations, setStations] = useState<StationOpt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Add-train form state
  const [trainName, setTrainName] = useState("");
  const [startStationId, setStartStationId] = useState("");
  const [endStationId, setEndStationId] = useState("");
  const [departureTime, setDepartureTime] = useState("09:00");
  const [reverseDepartureTime, setReverseDepartureTime] = useState("18:00");
  const [fare, setFare] = useState<number>(500);
  const [numCompartments, setNumCompartments] = useState<number>(4);
  const [compartmentSeats, setCompartmentSeats] = useState<number>(50);

  // Inline compartments editor
  const [selectedTrainId, setSelectedTrainId] = useState<string>("");
  const [newCName, setNewCName] = useState("");
  const [newCSeats, setNewCSeats] = useState<number>(50);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/train/trains");
    const data = (await res.json().catch(() => null)) as
      | { ok: true; trains: TrainRow[]; stations: StationOpt[] }
      | { ok: false; error: string }
      | null;
    if (!data || !data.ok) {
      setError(data?.error ?? "Failed to load trains.");
      return;
    }
    setTrains(data.trains);
    setStations(data.stations);
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedTrain = useMemo(
    () => trains.find((t) => t.id === selectedTrainId) ?? null,
    [trains, selectedTrainId],
  );

  async function addTrain(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/train/trains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: trainName,
        startStationId,
        endStationId,
        departureTime,
        reverseDepartureTime,
        fare,
        numCompartments,
        compartmentSeats,
      }),
    });
    setLoading(false);
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to add train.");
      return;
    }
    setTrainName("");
    await load();
  }

  async function toggleActive(t: TrainRow) {
    setError(null);
    const res = await fetch("/api/admin/train/trains", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, active: !t.active }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to update train.");
      return;
    }
    await load();
  }

  async function deleteTrain(t: TrainRow) {
    if (!confirm(`Delete train "${t.name}" (${t.startStation.name} → ${t.endStation.name})?`)) return;
    setError(null);
    const res = await fetch(`/api/admin/train/trains?id=${encodeURIComponent(t.id)}`, {
      method: "DELETE",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to delete train.");
      return;
    }
    if (selectedTrainId === t.id) setSelectedTrainId("");
    await load();
  }

  async function addCompartment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrain) return;
    setError(null);
    const res = await fetch("/api/admin/train/compartments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trainId: selectedTrain.id,
        name: newCName,
        totalSeats: newCSeats,
      }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to add compartment.");
      return;
    }
    setNewCName("");
    setNewCSeats(50);
    await load();
  }

  async function updateCompartment(c: Compartment, patch: { name?: string; totalSeats?: number }) {
    setError(null);
    const res = await fetch("/api/admin/train/compartments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, ...patch }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to update compartment.");
      return;
    }
    await load();
  }

  async function deleteCompartment(c: Compartment) {
    if (!confirm(`Delete compartment "${c.name}"?`)) return;
    setError(null);
    const res = await fetch(`/api/admin/train/compartments?id=${encodeURIComponent(c.id)}`, {
      method: "DELETE",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to delete compartment.");
      return;
    }
    await load();
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Trains</h1>
      <p className="mt-2 text-[var(--muted)]">
        Add a train to create both directions automatically. Each train is auto-seeded with
        compartments and seats.
      </p>

      <form
        onSubmit={addTrain}
        className="mt-6 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="lg:col-span-2">
          <label className="text-sm font-medium">Train name</label>
          <input
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 outline-none"
            placeholder="Subarna Express"
            value={trainName}
            onChange={(e) => setTrainName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">From station</label>
          <select
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={startStationId}
            onChange={(e) => setStartStationId(e.target.value)}
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
        <div>
          <label className="text-sm font-medium">To station</label>
          <select
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={endStationId}
            onChange={(e) => setEndStationId(e.target.value)}
            required
          >
            <option value="">Select</option>
            {stations
              .filter((s) => s.id !== startStationId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Departure (HH:MM)</label>
          <input
            type="time"
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Reverse departure</label>
          <input
            type="time"
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={reverseDepartureTime}
            onChange={(e) => setReverseDepartureTime(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Fare (BDT)</label>
          <input
            type="number"
            min={0}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={fare}
            onChange={(e) => setFare(Number(e.target.value))}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium"># Compartments</label>
          <input
            type="number"
            min={1}
            max={20}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={numCompartments}
            onChange={(e) => setNumCompartments(Number(e.target.value))}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Seats / compartment</label>
          <input
            type="number"
            min={1}
            max={200}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
            value={compartmentSeats}
            onChange={(e) => setCompartmentSeats(Number(e.target.value))}
            required
          />
        </div>
        <div className="flex items-end lg:col-span-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 sm:w-auto"
          >
            {loading ? "Adding..." : "Add train (both directions)"}
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
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Departs</th>
              <th className="px-4 py-3">Fare</th>
              <th className="px-4 py-3">Coaches</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {trains.map((t) => (
              <tr key={t.id} className="border-b border-[var(--border)] last:border-b-0">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {t.startStation.name} → {t.endStation.name}
                </td>
                <td className="px-4 py-3">{t.departureTime}</td>
                <td className="px-4 py-3 font-semibold">{t.fare} BDT</td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {t.compartments.length} ·{" "}
                  {t.compartments.reduce((acc, c) => acc + c.totalSeats, 0)} seats
                </td>
                <td className="px-4 py-3">
                  {t.active ? (
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
                      onClick={() =>
                        setSelectedTrainId(selectedTrainId === t.id ? "" : t.id)
                      }
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--card)]"
                    >
                      {selectedTrainId === t.id ? "Hide compartments" : "Edit compartments"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(t)}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--card)]"
                    >
                      {t.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTrain(t)}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-700 hover:bg-red-500/15"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {trains.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={7}>
                  No trains yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedTrain ? (
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold">
                Compartments — {selectedTrain.name} ({selectedTrain.startStation.name} →{" "}
                {selectedTrain.endStation.name})
              </div>
              <div className="text-xs text-[var(--muted)]">
                Add, rename, or resize coaches. Resizing below the highest booked seat is blocked.
              </div>
            </div>
          </div>

          <form
            onSubmit={addCompartment}
            className="mt-4 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 sm:grid-cols-3"
          >
            <div>
              <label className="text-sm font-medium">Compartment name</label>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
                placeholder="C5"
                value={newCName}
                onChange={(e) => setNewCName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Total seats</label>
              <input
                type="number"
                min={1}
                max={200}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
                value={newCSeats}
                onChange={(e) => setNewCSeats(Number(e.target.value))}
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Add compartment
              </button>
            </div>
          </form>

          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Total seats</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedTrain.compartments.map((c) => (
                  <CompartmentRow
                    key={c.id}
                    c={c}
                    onUpdate={(patch) => updateCompartment(c, patch)}
                    onDelete={() => deleteCompartment(c)}
                  />
                ))}
                {selectedTrain.compartments.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-[var(--muted)]" colSpan={3}>
                      No compartments.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CompartmentRow({
  c,
  onUpdate,
  onDelete,
}: {
  c: Compartment;
  onUpdate: (patch: { name?: string; totalSeats?: number }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [name, setName] = useState(c.name);
  const [seats, setSeats] = useState<number>(c.totalSeats);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(c.name);
    setSeats(c.totalSeats);
  }, [c.id, c.name, c.totalSeats]);

  const dirty = name.trim() !== c.name || seats !== c.totalSeats;

  async function save() {
    setSaving(true);
    const patch: { name?: string; totalSeats?: number } = {};
    if (name.trim() !== c.name) patch.name = name.trim();
    if (seats !== c.totalSeats) patch.totalSeats = seats;
    if (Object.keys(patch).length > 0) await onUpdate(patch);
    setSaving(false);
  }

  return (
    <tr className="border-b border-[var(--border)] last:border-b-0">
      <td className="px-4 py-2">
        <input
          className="w-32 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min={1}
          max={200}
          className="w-24 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm outline-none"
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
        />
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--card)] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-700 hover:bg-red-500/15"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
