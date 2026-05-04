import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";

export const runtime = "nodejs";

export default async function ControlAppLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(adminCookieName())?.value;
  if (!token) redirect("/control/login?reason=unauthorized");
  const ok = await verifyAdminSession(token).catch(() => null);
  if (!ok) redirect("/control/login?reason=unauthorized");

  return (
    <div>
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color:var(--background)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/control" className="text-sm font-semibold tracking-tight">
            Admin Control
          </Link>

          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/control/metro/stations"
              className="rounded-full px-3 py-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)]"
            >
              Stations
            </Link>
            <Link
              href="/control/metro/fares"
              className="rounded-full px-3 py-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)]"
            >
              Fares
            </Link>
            <Link
              href="/control/bus/routes"
              className="rounded-full px-3 py-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)]"
            >
              Bus Routes
            </Link>
            <Link
              href="/control/bus/buses"
              className="rounded-full px-3 py-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)]"
            >
              Buses
            </Link>
            <Link
              href="/control/bus/trips"
              className="rounded-full px-3 py-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)]"
            >
              Trips
            </Link>
            <form action="/api/admin/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm hover:opacity-90"
              >
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}

