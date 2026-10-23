import { Suspense } from "react";
import { ConsentCard } from "./consent-card";

export const metadata = { title: "Allow access | Smart Content" };

export default function ConsentPage() {
  return (
    <Suspense>
      <ConsentCard />
    </Suspense>
  );
}
