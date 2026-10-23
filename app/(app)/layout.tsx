import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";

// The app area is client-rendered per user, so it streams inside a Suspense boundary.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" aria-busy="true" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
