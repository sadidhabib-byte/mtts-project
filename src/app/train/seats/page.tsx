import { Suspense } from "react";
import { TrainSeatsClient } from "./seats-client";

export default function TrainSeatsPage() {
  return (
    <Suspense>
      <TrainSeatsClient />
    </Suspense>
  );
}
