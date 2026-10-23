"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { StoreProvider, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/topbar";

function Toasts() {
  const { toasts } = useStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={cn("flex items-start gap-2.5 rounded-xl border bg-surface px-4 py-3 text-[13px] shadow-lg", t.tone === "error" ? "border-red-200" : "border-line")}>
          {t.tone === "error" ? <AlertCircle className="mt-0.5 size-4 flex-none text-danger" /> : <CheckCircle2 className="mt-0.5 size-4 flex-none text-good" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

function ServerBanner() {
  const { live, serverError, refresh } = useStore();
  if (!live || !serverError) return null;
  return (
    <div role="alert" className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-[13px] text-danger lg:px-8">
      <AlertCircle className="size-4 flex-none" />
      <span className="flex-1">{serverError}</span>
      <button onClick={() => void refresh()} className="cursor-pointer font-semibold underline">Retry</button>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const { hydrated, live, state, serverError } = useStore();
  const router = useRouter();
  const path = usePathname();

  // Live accounts without a workspace go through onboarding first (PRD §9.1).
  useEffect(() => {
    if (live && hydrated && !serverError && state.workspaces.length === 0 && path !== "/onboarding") router.replace("/onboarding");
  }, [live, hydrated, serverError, state.workspaces.length, path, router]);
  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none border-r border-black/5 lg:block">
        <Sidebar />
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[272px] shadow-2xl">
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setDrawer(true)} />
        <ServerBanner />
        <main id="main" className={cn("mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 transition-opacity lg:px-8 lg:py-8", hydrated ? "opacity-100" : "opacity-0")}>
          {children}
        </main>
      </div>
      <Toasts />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <Frame>{children}</Frame>
    </StoreProvider>
  );
}
