"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Hold = { id: string; tripId: string; expiresAt: string; seats: string[] };

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function BusHoldTimer() {
  const pathname = usePathname();
  const [hold, setHold] = useState<Hold | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch("/api/bus/hold").catch(() => null);
      if (res?.status === 401) {
        setHold(null);
        return;
      }
      const data = res ? ((await res.json().catch(() => null)) as any) : null;
      if (cancelled) return;
      if (!data?.ok) {
        setHold(null);
        return;
      }
      setHold(data.hold ?? null);
    }
    void poll();
    const t = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const remainingMs = useMemo(() => (hold ? new Date(hold.expiresAt).getTime() - now : 0), [hold, now]);
  const visible = !!hold && remainingMs > 0;
  const onCheckout = pathname.startsWith("/bus/checkout");

  async function cancelHold() {
    await fetch("/api/bus/holds/cancel", { method: "POST" }).catch(() => {});
    setHold(null);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[320px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Seat hold active</div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Expires in <span className="font-semibold text-[var(--foreground)]">{formatMs(remainingMs)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={cancelHold}
          className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs hover:opacity-90"
        >
          Cancel
        </button>
      </div>

      <div className="mt-3 text-xs text-[var(--muted)]">Seats: {hold?.seats?.join(", ")}</div>

      {!onCheckout ? (
        <div className="mt-4">
          <Link
            href="/bus/checkout"
            className="block rounded-xl bg-zinc-900 px-4 py-2 text-center text-xs font-semibold text-white hover:bg-zinc-800"
          >
            Continue to payment
          </Link>
        </div>
      ) : null}
    </div>
  );
}

