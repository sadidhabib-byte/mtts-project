import Link from "next/link";

export default function ControlHome() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
      <p className="mt-2 text-[var(--muted)]">Manage Metro stations and fares.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/control/metro/stations"
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm hover:shadow-md"
        >
          <div className="text-sm font-semibold">Station management</div>
          <div className="mt-2 text-sm text-[var(--muted)]">Add, rename, toggle active.</div>
        </Link>
        <Link
          href="/control/metro/fares"
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm hover:shadow-md"
        >
          <div className="text-sm font-semibold">Fare management</div>
          <div className="mt-2 text-sm text-[var(--muted)]">Edit fares between stations.</div>
        </Link>
      </div>
    </div>
  );
}

