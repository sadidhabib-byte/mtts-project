import { Suspense } from "react";
import { ControlLoginForm } from "./ControlLoginForm";

export default function ControlLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="h-6 w-32 animate-pulse rounded bg-[var(--border)]" />
            <div className="mt-4 h-4 w-64 animate-pulse rounded bg-[var(--border)]" />
            <div className="mt-6 space-y-3">
              <div className="h-10 animate-pulse rounded-xl bg-[var(--border)]" />
              <div className="h-10 animate-pulse rounded-xl bg-[var(--border)]" />
              <div className="h-10 animate-pulse rounded-xl bg-[var(--border)]" />
            </div>
          </div>
        </div>
      }
    >
      <ControlLoginForm />
    </Suspense>
  );
}

