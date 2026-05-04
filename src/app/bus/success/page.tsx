import { Suspense } from "react";
import { BusSuccessClient } from "./success-client";

export default function BusSuccessPage() {
  return (
    <Suspense>
      <BusSuccessClient />
    </Suspense>
  );
}

