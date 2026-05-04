import { Suspense } from "react";
import { SuccessClient } from "./SuccessClient";

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="h-6 w-48 animate-pulse rounded bg-zinc-200" />
            <div className="mt-6 grid gap-3">
              <div className="h-10 animate-pulse rounded bg-zinc-100" />
              <div className="h-10 animate-pulse rounded bg-zinc-100" />
              <div className="h-10 animate-pulse rounded bg-zinc-100" />
            </div>
          </div>
        </div>
      }
    >
      <SuccessClient />
    </Suspense>
  );
}

