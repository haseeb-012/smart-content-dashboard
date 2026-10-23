"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Coins, LogOut, Menu, Search, Settings, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui";

export function CreditBadge() {
  const { state, limits } = useStore();
  const low = state.credits <= 10;
  return (
    <Link
      href="/settings?tab=Subscription"
      title={`${state.credits} of ${limits.credits} monthly credits left`}
      className={cn(
        "flex min-h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold tabular",
        state.credits === 0 ? "border-red-200 bg-red-50 text-danger" : low ? "border-orange-200 bg-warn-bg text-warn" : "border-line bg-surface text-ink",
      )}
    >
      <Coins className="size-4" aria-hidden />
      {state.credits}
      <span className="font-normal text-muted">/ {limits.credits} credits</span>
    </Link>
  );
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { state, signOut, live } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur lg:px-8">
      <IconButton label="Open navigation" icon={Menu} onClick={onMenu} className="lg:hidden" />
      <form
        role="search"
        className="relative max-w-md flex-1"
        onSubmit={(e) => { e.preventDefault(); router.push(`/videos?q=${encodeURIComponent(q)}`); }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
        <label htmlFor="global-search" className="sr-only">Search videos</label>
        <input
          id="global-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search videos, captions, creators…"
          className="min-h-9 w-full rounded-full border border-line bg-surface pl-9 pr-4 text-sm placeholder:text-subtle focus:border-accent focus:outline-none"
        />
      </form>
      <div className="ml-auto flex items-center gap-2">
        {!live && (
          <span title="Not connected to Supabase/API — data is stored in this browser only" className="hidden rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 sm:inline">
            Demo mode
          </span>
        )}
        <CreditBadge />
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Account menu"
            className="grid size-9 cursor-pointer place-items-center rounded-full bg-ink text-xs font-bold text-white"
          >
            {state.profile.name.slice(0, 1)}
          </button>
          {open && (
            <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-line bg-surface p-1 shadow-xl" onMouseLeave={() => setOpen(false)}>
              <div className="px-3 py-2">
                <p className="truncate text-[13px] font-semibold">{state.profile.name}</p>
                <p className="truncate text-xs text-muted">{state.profile.email}</p>
              </div>
              <div className="my-1 border-t border-line" />
              <Link href="/settings?tab=Profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] hover:bg-surface-2"><User className="size-4" /> Profile</Link>
              <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] hover:bg-surface-2"><Settings className="size-4" /> Settings</Link>
              <div className="my-1 border-t border-line" />
              <button onClick={() => void signOut()} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-danger hover:bg-red-50"><LogOut className="size-4" /> Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
