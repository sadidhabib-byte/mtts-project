import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="h-6 w-24 animate-pulse rounded bg-zinc-200" />
            <div className="mt-4 h-4 w-64 animate-pulse rounded bg-zinc-100" />
            <div className="mt-6 space-y-3">
              <div className="h-10 animate-pulse rounded-xl bg-zinc-100" />
              <div className="h-10 animate-pulse rounded-xl bg-zinc-100" />
              <div className="h-10 animate-pulse rounded-xl bg-zinc-200" />
            </div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

