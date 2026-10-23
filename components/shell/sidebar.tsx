"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookMarked, Check, ChevronsUpDown, Download, FileText, FolderOpen, LayoutDashboard, LifeBuoy, Lightbulb, Plus, Settings, Sparkles, Users, Video,
} from "lucide-react";
import { useAsyncAction, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button, Field, Input, Modal } from "@/components/ui";
import { LogoMark } from "@/components/shell/logo";

export const nav = [
  { group: "Research", items: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/videos", label: "Videos", icon: Video },
    { href: "/channels", label: "Channels", icon: Users },
    { href: "/ideas", label: "Ideas", icon: Lightbulb },
    { href: "/hooks", label: "Hooks", icon: Sparkles },
    { href: "/collections", label: "Collections", icon: BookMarked },
  ] },
  { group: "Create", items: [
    { href: "/scripts", label: "Scripts", icon: FileText },
    { href: "/projects", label: "Projects", icon: FolderOpen },
    { href: "/exports", label: "Exports", icon: Download },
  ] },
];

function WorkspaceSwitcher() {
  const { state, switchWorkspace, createWorkspace, limits } = useStore();
  const run = useAsyncAction();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    const id = await run(() => createWorkspace(name.trim()));
    setBusy(false);
    if (id) {
      setName("");
      setCreating(false);
      router.push("/channels");
    }
  };
  const current = state.workspaces.find((w) => w.id === state.activeId);
  const active = state.workspaces.filter((w) => w.active);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-black/5 bg-surface px-2.5 py-2 text-left shadow-sm hover:bg-surface-2"
      >
        <span className="grid size-7 place-items-center rounded-lg bg-accent-soft text-xs font-bold text-accent">{current?.name.slice(0, 1)}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-subtle">Workspace</span>
          <span className="block truncate text-[13px] font-semibold">{current?.name}</span>
        </span>
        <ChevronsUpDown className="size-4 text-subtle" />
      </button>
      {open && (
        <div role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 rounded-xl border border-line bg-surface p-1 shadow-xl">
          {active.map((w) => (
            <button
              key={w.id}
              role="option"
              aria-selected={w.id === state.activeId}
              onClick={() => { switchWorkspace(w.id); setOpen(false); }}
              className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[13px] hover:bg-surface-2"
            >
              <span className="truncate">{w.name}</span>
              {w.id === state.activeId && <Check className="size-4 text-accent" />}
            </button>
          ))}
          <div className="my-1 border-t border-line" />
          <button onClick={() => { setOpen(false); setCreating(true); }} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-muted hover:bg-surface-2 hover:text-ink">
            <Plus className="size-4" /> New workspace <span className="ml-auto text-[11px]">{active.length}/{limits.workspaces}</span>
          </button>
        </div>
      )}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create workspace"
        footer={
          <>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
            <Button variant="primary" disabled={!name.trim()} loading={busy} onClick={submit}>
              Create
            </Button>
          </>
        }
      >
        <Field label="Workspace name" hint="Use one workspace per niche or client.">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fitness niche" onKeyDown={(e) => e.key === "Enter" && submit()} />
        </Field>
      </Modal>
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const isActive = (href: string) => path === href || path.startsWith(`${href}/`);

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto bg-sidebar p-4">
      <Link href="/dashboard" className="flex items-center gap-2 px-1" onClick={onNavigate}>
        <LogoMark />
        <span className="font-display text-[19px] font-medium tracking-[-0.02em]">Smart Content</span>
      </Link>
      <WorkspaceSwitcher />
      <nav aria-label="Primary" className="flex flex-col gap-5">
        {nav.map((g) => (
          <div key={g.group}>
            <p className="px-2.5 text-xs font-medium text-subtle">{g.group}</p>
            <ul className="mt-1.5 space-y-0.5">
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onNavigate}
                    aria-current={isActive(it.href) ? "page" : undefined}
                    className={cn(
                      "flex min-h-9 items-center gap-3 rounded-lg px-2.5 text-[14px] transition",
                      isActive(it.href)
                        ? "bg-surface font-semibold text-accent shadow-sm"
                        : "text-ink/75 hover:bg-accent/[0.06] hover:text-ink",
                    )}
                  >
                    <it.icon className="size-[18px]" />
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-auto space-y-0.5">
        <Link
          href="/settings"
          onClick={onNavigate}
          aria-current={isActive("/settings") ? "page" : undefined}
          className={cn("flex min-h-9 items-center gap-3 rounded-lg px-2.5 text-[14px]", isActive("/settings") ? "bg-surface font-semibold shadow-sm" : "text-ink/75 hover:bg-black/[0.04]")}
        >
          <Settings className="size-[18px]" /> Settings
        </Link>
        <a href={process.env.NEXT_PUBLIC_HELP_URL ?? "#"} className="flex min-h-9 items-center gap-3 rounded-lg px-2.5 text-[14px] text-ink/75 hover:bg-black/[0.04]">
          <LifeBuoy className="size-[18px]" /> Help Center
        </a>
      </div>
    </div>
  );
}
