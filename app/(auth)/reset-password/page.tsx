import { Suspense } from "react";
import { AuthCard } from "../auth-card";

export const metadata = { title: "New password | Smart Content" };
export default function ResetPassword() {
  return (
    <Suspense>
      <AuthCard mode="reset" />
    </Suspense>
  );
}
