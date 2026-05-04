import Link from "next/link";

export default function ControlHome() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
      <p className="mt-2 text-[var(--muted)]">Manage Metro, Bus, and Train settings.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <Link
          href="/control/bus/routes"
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm hover:shadow-md"
        >
          <div className="text-sm font-semibold">Bus route management</div>
          <div className="mt-2 text-sm text-[var(--muted)]">Create/disable intercity routes.</div>
        </Link>
        <Link
          href="/control/bus/buses"
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm hover:shadow-md"
        >
          <div className="text-sm font-semibold">Bus & seat layout management</div>
          <div className="mt-2 text-sm text-[var(--muted)]">Edit per-bus seat layouts (JSON).</div>
        </Link>
        <Link
          href="/control/bus/trips"
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm hover:shadow-md"
        >
          <div className="text-sm font-semibold">Bus trip management</div>
          <div className="mt-2 text-sm text-[var(--muted)]">Schedule trips (date/time/fare).</div>
        </Link>
        <Link
          href="/control/train/stations"
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm hover:shadow-md"
        >
          <div className="text-sm font-semibold">Train station management</div>
          <div className="mt-2 text-sm text-[var(--muted)]">Add, rename, toggle active.</div>
        </Link>
        <Link
          href="/control/train/trains"
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm hover:shadow-md"
        >
          <div className="text-sm font-semibold">Train management</div>
          <div className="mt-2 text-sm text-[var(--muted)]">
            Schedule trains, edit fares, manage compartments.
          </div>
        </Link>
      </div>
    </div>
  );
}

