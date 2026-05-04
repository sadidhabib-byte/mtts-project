"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BusHoldTimer } from "@/components/BusHoldTimer";
import { TrainHoldTimer } from "@/components/TrainHoldTimer";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminArea = pathname === "/control" || pathname.startsWith("/control/");

  if (isAdminArea) return <>{children}</>;

  return (
    <>
      <Navbar />
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        <div className="pointer-events-auto"><BusHoldTimer /></div>
        <div className="pointer-events-auto"><TrainHoldTimer /></div>
      </div>
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

