import { Suspense } from "react";
import { TrainSuccessClient } from "./success-client";

export default function TrainSuccessPage() {
  return (
    <Suspense>
      <TrainSuccessClient />
    </Suspense>
  );
}
