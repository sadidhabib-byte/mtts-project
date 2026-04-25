"use client";

import { useEffect, useState } from "react";

type User = { id: string; name: string; email: string; avatarPath?: string | null };
type Transaction = {
  transactionId: string;
  startStation: string;
  endStation: string;
  fare: number;
  paymentMethod: string;
  createdAt: string;
  validTill: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/profile");
    // #region agent log
    fetch("/api/debug/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "b0b5df",
        runId: "pre-fix",
        hypothesisId: "H4",
        location: "src/app/profile/page.tsx:30",
        message: "Profile page fetch /api/profile status",
        data: { status: res.status, ok: res.ok },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const data = (await res.json().catch(() => null)) as
      | { ok: true; user: User }
      | { ok: false; error: string }
      | null;
    if (!data || !data.ok) {
      setError(data?.error ?? "Failed to load profile.");
      return;
    }
    setUser(data.user);
    setName(data.user.name);
    setEmail(data.user.email);

    const tr = await fetch("/api/profile/transactions");
    const td = (await tr.json().catch(() => null)) as
      | { ok: true; transactions: Transaction[] }
      | { ok: false; error: string }
      | null;
    if (td && td.ok) setTransactions(td.transactions);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok: true; user: User }
      | { ok: false; error: string }
      | null;
    if (!data || !data.ok) {
      setError(data?.error ?? "Update failed.");
      return;
    }
    setUser(data.user);
    setMsg("Profile updated.");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    const res = await fetch("/api/profile/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Password change failed.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setMsg("Password changed.");
  }

  async function uploadAvatar(file: File) {
    setMsg(null);
    setError(null);
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
    const data = (await res.json().catch(() => null)) as
      | { ok: true; user: User }
      | { ok: false; error: string }
      | null;
    if (!data || !data.ok) {
      setError(data?.error ?? "Avatar upload failed.");
      return;
    }
    setUser(data.user);
    setMsg("Avatar updated.");
  }

  if (!user && !error) {
    return <div className="mx-auto max-w-4xl px-4 py-10 text-[var(--muted)]">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
          {error ?? "Unable to load profile."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-2 text-[var(--muted)]">Update your account details and avatar.</p>

      {msg ? (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
          {msg}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold">Avatar</h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--card)]">
              {user.avatarPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarPath} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/images/default_profile_account_photo.jpg"
                  alt="default avatar"
                  className="h-full w-full object-cover opacity-90"
                />
              )}
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadAvatar(f);
              }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">PNG/JPG/WebP up to 2MB.</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold">Account</h2>
          <form onSubmit={saveProfile} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Save changes
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 md:col-span-2">
          <h2 className="text-lg font-semibold">Change password</h2>
          <form onSubmit={changePassword} className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Current password</label>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                type="password"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">New password</label>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 outline-none"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                minLength={6}
                required
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Change password
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 md:col-span-2">
          <h2 className="text-lg font-semibold">Purchase history</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Your most recent transactions.
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Transaction</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Fare</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.transactionId} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="px-4 py-3 font-mono text-xs">{t.transactionId}</td>
                    <td className="px-4 py-3">
                      {t.startStation} → {t.endStation}
                    </td>
                    <td className="px-4 py-3 font-semibold">{t.fare}</td>
                    <td className="px-4 py-3">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <a
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[color:var(--card)]/60"
                        href={`/api/metro/receipt?transactionId=${encodeURIComponent(t.transactionId)}`}
                      >
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-[var(--muted)]" colSpan={5}>
                      No purchases yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

