import { Suspense } from "react";
import { BusSeatsClient } from "./seats-client";

export default function BusSeatsPage() {
  return (
    <Suspense>
      <BusSeatsClient />
    </Suspense>
  );
}

