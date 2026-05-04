"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BusHoldTimer } from "@/components/BusHoldTimer";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminArea = pathname === "/control" || pathname.startsWith("/control/");

  if (isAdminArea) return <>{children}</>;

  return (
    <>
      <Navbar />
      <BusHoldTimer />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

