import { Suspense } from "react";
import { AuthCard } from "../auth-card";

export const metadata = { title: "Sign up | Smart Content" };
export default function Signup() {
  return (
    <Suspense>
      <AuthCard mode="signup" />
    </Suspense>
  );
}
