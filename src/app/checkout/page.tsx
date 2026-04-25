"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearTripDraft, loadTripDraft } from "@/lib/tripStore";

type PaymentMethod = "" | "bkash" | "rocket" | "card";

type CheckoutResponse =
  | { ok: true; transactionId: string }
  | { ok: false; error: string };

export default function CheckoutPage() {
  const router = useRouter();
  const [trip, setTrip] = useState<ReturnType<typeof loadTripDraft>>(null);

  const [method, setMethod] = useState<PaymentMethod>("");
  const [accountNumber, setAccountNumber] = useState("");
  const [pin, setPin] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = loadTripDraft();
    setTrip(t);
    if (!t) router.replace("/metro");
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!trip) return;
    if (!method) {
      setError("Select a payment method.");
      return;
    }
    if (!accountNumber.trim()) {
      setError("Account/Card number is required.");
      return;
    }
    if (method === "card" && !cardExpiry.trim()) {
      setError("Expiry date is required.");
      return;
    }
    if (!pin.trim()) {
      setError(method === "card" ? "CVV is required." : "PIN is required.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/metro/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startStation: trip.startStation,
        endStation: trip.endStation,
        fare: trip.fare,
        method,
        accountNumber,
        pin,
        cardExpiry: method === "card" ? cardExpiry : undefined,
      }),
    });
    setLoading(false);

    const data = (await res.json().catch(() => null)) as CheckoutResponse | null;
    if (!data || !data.ok) {
      setError(data?.error ?? "Payment failed.");
      return;
    }

    clearTripDraft();
    router.push(`/success?transactionId=${encodeURIComponent(data.transactionId)}`);
  }

  if (!trip) return null;

  return (
    <div className="relative flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.35),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.25),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[var(--glass-overlay)]" />

      <div className="w-full max-w-2xl rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6 text-[var(--glass-fg)] shadow-2xl backdrop-blur md:p-10">
        <h1 className="text-center text-3xl font-semibold tracking-tight">
          Confirm Payment
        </h1>

        <div className="mt-8 grid gap-3 rounded-2xl border border-[var(--glass-border)] bg-[color:var(--glass-input-bg)]/40 p-5 opacity-95 sm:grid-cols-3">
          <div>
            <div className="text-xs opacity-70">Start</div>
            <div className="mt-1 font-medium">{trip.startStation}</div>
          </div>
          <div>
            <div className="text-xs opacity-70">End</div>
            <div className="mt-1 font-medium">{trip.endStation}</div>
          </div>
          <div>
            <div className="text-xs opacity-70">Fare</div>
            <div className="mt-1 font-semibold">{trip.fare} BDT</div>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-medium opacity-90">Payment method</label>
            <select
              className="mt-2 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-input-bg)] px-4 py-3 text-[var(--glass-input-fg)] outline-none focus:border-[color:var(--glass-border)]"
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
                <label className="text-sm font-medium text-white/90">
                  {method === "card" ? "Card number" : "Account number"}
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-input-bg)] px-4 py-3 text-[var(--glass-input-fg)] outline-none placeholder:text-[var(--glass-input-placeholder)] focus:border-[color:var(--glass-border)]"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={method === "card" ? "XXXX-XXXX-XXXX-XXXX" : "01XXXXXXXXX"}
                  required
                />
              </div>

              {method === "card" ? (
                <div>
                  <label className="text-sm font-medium text-white/90">Expiry date</label>
                  <input
                    className="mt-2 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-input-bg)] px-4 py-3 text-[var(--glass-input-fg)] outline-none placeholder:text-[var(--glass-input-placeholder)] focus:border-[color:var(--glass-border)]"
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
                <label className="text-sm font-medium text-white/90">
                  {method === "card" ? "CVV" : "PIN"}
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-input-bg)] px-4 py-3 text-[var(--glass-input-fg)] outline-none placeholder:text-[var(--glass-input-placeholder)] focus:border-[color:var(--glass-border)]"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={method === "card" ? "***" : "****"}
                  required
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-400 hover:to-sky-400 disabled:opacity-60"
            >
              {loading ? "Processing..." : "Pay Now"}
            </button>
            <Link
              href="/metro"
              className="rounded-xl bg-white/10 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-white/15"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

