"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PaymentMethod = "" | "bkash" | "rocket" | "card";

export default function BusCheckoutPage() {
  const router = useRouter();
  const [hold, setHold] = useState<null | { id: string; tripId: string; expiresAt: string; seats: string[] }>(null);
  const [method, setMethod] = useState<PaymentMethod>("");
  const [accountNumber, setAccountNumber] = useState("");
  const [pin, setPin] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/bus/hold")
      .then((r) => r.json())
      .then((d: { ok?: boolean; hold?: any; error?: string }) => {
        if (!d.ok) {
          setError(d.error ?? "Unauthorized");
          return;
        }
        if (!d.hold) router.replace("/bus");
        else setHold(d.hold);
      })
      .catch(() => setError("Failed to load hold."));
  }, [router]);

  async function cancelHold() {
    setError(null);
    await fetch("/api/bus/holds/cancel", { method: "POST" }).catch(() => {});
    router.replace("/bus");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!hold) return;
    if (!method) return setError("Select a payment method.");
    if (!accountNumber.trim()) return setError("Account/Card number is required.");
    if (method === "card" && !cardExpiry.trim()) return setError("Expiry date is required.");
    if (!pin.trim()) return setError(method === "card" ? "CVV is required." : "PIN is required.");

    setLoading(true);
    const res = await fetch("/api/bus/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method,
        accountNumber,
        pin,
        cardExpiry: method === "card" ? cardExpiry : undefined,
      }),
    });
    setLoading(false);
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; bookingRef?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Payment failed.");
      return;
    }
    router.push(`/bus/success?bookingRef=${encodeURIComponent(data.bookingRef ?? "")}`);
  }

  if (!hold) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Bus Checkout</h1>
      <p className="mt-2 text-[var(--muted)]">
        Your seats are held until <span className="font-semibold text-[var(--foreground)]">{new Date(hold.expiresAt).toLocaleTimeString()}</span>.
      </p>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm">
        <div className="text-[var(--muted)]">Selected seats</div>
        <div className="mt-1 font-semibold">{hold.seats.join(", ")}</div>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div>
          <label className="text-sm font-medium">Payment method</label>
          <select
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 outline-none"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            required
          >
            <option value="">Select Payment Method</option>
            <option value="bkash">bKash</option>
            <option value="rocket">Rocket</option>
            <option value="card">Card</option>
          </select>
        </div>

        {method ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">{method === "card" ? "Card number" : "Account number"}</label>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 outline-none"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={method === "card" ? "4111111111111111" : "01700000000"}
                required
              />
            </div>

            {method === "card" ? (
              <div>
                <label className="text-sm font-medium">Expiry date</label>
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 outline-none"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="MM/YY"
                  required
                />
              </div>
            ) : (
              <div />
            )}

            <div>
              <label className="text-sm font-medium">{method === "card" ? "CVV" : "PIN"}</label>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 outline-none"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={method === "card" ? "123" : "1234"}
                required
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">{error}</div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Processing..." : "Pay & confirm"}
          </button>
          <button
            type="button"
            onClick={cancelHold}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-semibold hover:opacity-90"
          >
            Cancel hold
          </button>
          <Link href="/bus" className="rounded-xl bg-[var(--background)] px-5 py-3 text-center text-sm font-semibold hover:opacity-90">
            Back
          </Link>
        </div>
      </form>
    </div>
  );
}

