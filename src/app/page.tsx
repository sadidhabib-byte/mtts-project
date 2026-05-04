import { HomeDebugProbe } from "./HomeDebugProbe";

export default function Home() {
  return (
    <div className="bg-[var(--background)] text-[var(--foreground)]">
      {/* #region agent log */}
      {process.env.NODE_ENV === "development" ? <HomeDebugProbe /> : null}
      {/* #endregion */}
      <div className="bg-red-50 text-red-900">
        <div className="mx-auto max-w-6xl px-4 py-2 text-sm">
          <span className="font-semibold">Notice:</span>{" "}
          Please make sure that your payment is done under 15 minutes otherwise you will not be
          able to select your desired seat. If you find any bugs, contact support.
        </div>
      </div>

      <section className="relative min-h-[60vh] overflow-hidden">
        {/* 1. BACKGROUND LAYER: Changed from -z-10 to z-0 */}
        <div
          id="home-hero-bg"
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at top, rgba(99,102,241,0.28), transparent 55%), radial-gradient(ellipse at bottom, rgba(16,185,129,0.22), transparent 55%), linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url('/images/metro.jpg')",
          }}
        />

        {/* 2. CONTENT LAYER: Added "relative z-10" to lift the text above the background */}
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            {/* Left Column: Text & Buttons */}
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">
                Mass Transport Ticketing System
              </h1>
              <p className="mt-4 text-lg text-[var(--muted)]">
                Purchase Metro tickets with a clean, fast checkout. Train and Bus will be added next.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/metro"
                  className="rounded-xl bg-zinc-900 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Buy Metro Ticket
                </a>
                <a
                  href="/signup"
                  className="rounded-xl border border-[var(--border)] px-5 py-3 text-center text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--card)]"
                >
                  Create Account
                </a>
              </div>
            </div>

            {/* Right Column: Cards */}
            <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              {/* The card background is working fine here! */}
              <div className="pointer-events-none absolute inset-0 -z-10 bg-[url('/images/metro.jpg')] bg-cover bg-center opacity-15" />
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 p-4 text-white">
                  <div className="text-sm font-semibold">Metro</div>
                  <div className="mt-2 text-xs text-white/80">
                    Comfort travel with updated technology.
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[color:var(--card)] p-4 text-[var(--muted)]">
                  <div className="text-sm font-semibold text-[var(--foreground)]">Train</div>
                  <div className="mt-2 text-xs">Coming soon</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[color:var(--card)] p-4 text-[var(--muted)]">
                  <div className="text-sm font-semibold text-[var(--foreground)]">Bus</div>
                  <div className="mt-2 text-xs">Coming soon</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[color:var(--card)]/40">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-center text-2xl font-semibold">Why Choose Us</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <Card title="Convenience" body="Book tickets from home with an easy platform." />
            <Card title="Reliability" body="Punctual services and consistent experience." />
            <Card title="Affordability" body="Pricing aligned with official fares." />
            <Card title="Ease of Payment" body="Multiple payment methods (simulated for demo)." />
          </div>
        </div>
      </section>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="text-sm font-semibold text-[var(--foreground)]">{title}</div>
      <div className="mt-2 text-sm text-[var(--muted)]">{body}</div>
    </div>
  );
}
