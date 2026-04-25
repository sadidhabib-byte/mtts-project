"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";

type TxnDetails = {
  transactionId: string;
  startStation: string;
  endStation: string;
  fare: number;
  createdAt: string;
  validTill: string;
};

type TxnResponse = { ok: true; transaction: TxnDetails } | { ok: false; error: string };

export function SuccessClient() {
  const sp = useSearchParams();
  const transactionId = sp.get("transactionId") ?? "";

  const [txn, setTxn] = useState<TxnDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!transactionId) {
      setError("Missing transaction ID.");
      return;
    }
    fetch(`/api/metro/transaction?transactionId=${encodeURIComponent(transactionId)}`)
      .then((r) => r.json())
      .then((d: TxnResponse) => {
        if (!d.ok) {
          setError(d.error);
          return;
        }
        setTxn(d.transaction);
      })
      .catch(() => setError("Unable to load transaction."));
  }, [transactionId]);

  useEffect(() => {
    if (!txn) return;
    const qrContent = [
      `Transaction ID: ${txn.transactionId}`,
      `Start: ${txn.startStation}`,
      `End: ${txn.endStation}`,
      `Fare: BDT ${txn.fare}`,
      `Payment Time: ${txn.createdAt}`,
      `Valid Till: ${txn.validTill}`,
    ].join("\n");
    QRCode.toDataURL(qrContent, { margin: 1, width: 220 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [txn]);

  return (
    <div className="relative flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.35),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.25),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/30" />

      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur md:p-10">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-white">
          Payment Successful
        </h1>
        <p className="mt-2 text-center text-sm text-white/70">
          Your payment has been successfully processed.
        </p>

        {error ? (
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {txn ? (
          <div className="mt-8 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-white/90">
            <Row label="Transaction ID" value={txn.transactionId} />
            <Row label="Start" value={txn.startStation} />
            <Row label="End" value={txn.endStation} />
            <Row label="Fare" value={`${txn.fare} BDT`} />
            <Row label="Payment time" value={new Date(txn.createdAt).toLocaleString()} />
            <Row label="Valid till" value={new Date(txn.validTill).toLocaleString()} />

            {qr ? (
              <div className="mt-3 flex justify-center">
                <img
                  src={qr}
                  alt="QR Code"
                  className="h-[220px] w-[220px] rounded-2xl border border-white/10 bg-white/5 p-3"
                />
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a
                href={`/api/metro/receipt?transactionId=${encodeURIComponent(txn.transactionId)}`}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-400 hover:to-sky-400"
              >
                Download Receipt
              </a>
              <Link
                href="/metro"
                className="rounded-xl bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/15"
              >
                Back to Metro
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/10 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-white/70">{label}</div>
      <div className="font-medium text-white">{value}</div>
    </div>
  );
}

