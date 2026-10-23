import { Suspense } from "react";
import { AuthCard } from "../auth-card";

export const metadata = { title: "Log in | Smart Content" };
export default function Login() {
  return (
    <Suspense>
      <AuthCard mode="login" />
    </Suspense>
  );
}
