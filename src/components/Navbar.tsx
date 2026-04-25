"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";
import { useEffect, useRef, useState } from "react";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={[
        "relative rounded-full px-3 py-1.5 text-sm font-medium transition",
        active
          ? "text-[var(--foreground)]"
          : "text-[var(--muted)] hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      {label}
      <span
        className={[
          "absolute left-3 right-3 -bottom-0.5 h-0.5 rounded",
          active ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500" : "bg-transparent",
        ].join(" ")}
      />
    </Link>
  );
}

export function Navbar() {
  const { data } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color:var(--background)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
          Mass Transport Ticketing System
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/" label="Home" />
          <NavLink href="/metro" label="Metro" />
          <span className="rounded-full px-3 py-1.5 text-sm text-[var(--muted)]">Train</span>
          <span className="rounded-full px-3 py-1.5 text-sm text-[var(--muted)]">Bus</span>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {data?.user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:opacity-90"
              >
                <span className="hidden sm:inline">{data.user.name ?? "Account"}</span>
                <span className="text-xs opacity-70">▾</span>
              </button>

              {open ? (
                <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-lg">
                  <Link
                    href="/profile"
                    className="block px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[color:var(--card)]/60"
                    onClick={() => setOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block w-full px-4 py-2.5 text-left text-sm text-[var(--foreground)] hover:bg-[color:var(--card)]/60"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card)]"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

