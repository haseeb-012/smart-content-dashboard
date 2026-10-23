import { Suspense } from "react";
import { AuthCard } from "../auth-card";

export const metadata = { title: "Reset password | Smart Content" };
export default function Forgot() {
  return (
    <Suspense>
      <AuthCard mode="forgot" />
    </Suspense>
  );
}
