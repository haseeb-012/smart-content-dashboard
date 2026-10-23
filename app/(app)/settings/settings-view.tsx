"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, Check, Coins, Copy, KeyRound, Loader2, Lock, Plug, ShieldCheck, Trash2 } from "lucide-react";
import { useAction, useAsyncAction, useStore } from "@/lib/store";
import { api } from "@/lib/api/client";
import { PLAN_LIMITS } from "@/lib/mock/data";
import type { Platform, PlanId } from "@/lib/types";
import { ago, cn } from "@/lib/utils";
import { Badge, Button, Card, Field, Input, PageHeader, PlatformIcon, Segmented, Select, Tabs } from "@/components/ui";

const TABS = ["Subscription", "Profile", "Social verification", "Workspaces", "Feature flags", "Connectors"] as const;
type Tab = (typeof TABS)[number];

const MCP_URL = process.env.NEXT_PUBLIC_MCP_URL ?? "https://mcp.smartcontent.example/mcp";

function TestModeBanner() {
  return (
    <div role="note" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 size-4 flex-none" />
      <p><strong>Test mode — no real payment.</strong> Checkout runs on Stripe&apos;s test environment. Use card 4242 4242 4242 4242 with any future date and CVC.</p>
    </div>
  );
}

type HistoryRow = { key: string; action: string; amount: number; at: string };

function Subscription() {
  const { state, limits, joinWaitlist, toast, adminSetPlan, live, me, refresh, startCheckout, openPortal } = useStore();
  const runAsync = useAsyncAction();
  const params = useSearchParams();
  const [cycle, setCycle] = useState<"Monthly" | "Yearly">("Monthly");
  const [pending, setPending] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const allowance = me?.credits.allowance ?? limits.credits;
  const used = me?.credits.used ?? limits.credits - state.credits;
  const billingReady = live && Boolean(me?.billing.checkout_available);

  // Live: credit history from the server ledger.
  useEffect(() => {
    if (!live) return;
    api
      .creditHistory(15)
      .then((h) => setHistory(h.entries.map((e) => ({ key: e.id, action: e.action, amount: e.amount, at: e.created_at }))))
      .catch(() => setHistory([]));
  }, [live, me?.credits.remaining]);

  // Back from Stripe Checkout: the plan changes when Stripe's webhook arrives, usually within seconds.
  const checkout = params.get("checkout");
  useEffect(() => {
    if (!checkout) return;
    if (checkout === "cancelled") {
      toast("Checkout cancelled — no charge was made.");
      return;
    }
    toast("Payment received (test mode). Updating your plan…");
    let n = 0;
    const id = window.setInterval(() => {
      void refresh();
      if (++n >= 6) window.clearInterval(id);
    }, 2000);
    return () => window.clearInterval(id);
  }, [checkout, refresh, toast]);

  const subscribed = ["active", "trialing", "past_due"].includes(me?.billing.subscription_status ?? "");
  const upgrade = async (id: PlanId) => {
    setPending(id);
    await runAsync(() => startCheckout(id, cycle === "Monthly" ? "monthly" : "yearly"));
    setPending(null);
  };
  const manage = async () => {
    setPending("portal");
    await runAsync(openPortal);
    setPending(null);
  };
  const rows: HistoryRow[] = live ? history ?? [] : state.creditLog.map((e) => ({ key: e.key, action: e.action, amount: -e.amount, at: e.at }));

  // Arrived from a landing pricing CTA (?plan=&cycle=): offer the chosen plan's checkout.
  const wanted = params.get("plan") as PlanId | null;
  const wantedCycle = params.get("cycle") === "yearly" ? "Yearly" : "Monthly";
  const showWanted = Boolean(wanted && wanted in PLAN_LIMITS && wanted !== state.plan && !subscribed && !checkout);

  return (
    <div className="space-y-5">
      <TestModeBanner />
      {showWanted && wanted && (
        <Card className="flex flex-wrap items-center gap-3 border-accent p-4">
          <p className="flex-1 text-sm">
            Ready to start <strong>{PLAN_LIMITS[wanted].name}</strong> ({wantedCycle.toLowerCase()})?
          </p>
          {billingReady ? (
            <Button
              variant="accent"
              loading={pending === wanted}
              onClick={async () => {
                setPending(wanted);
                await runAsync(() => startCheckout(wanted, wantedCycle === "Yearly" ? "yearly" : "monthly"));
                setPending(null);
              }}
            >
              Continue to test checkout
            </Button>
          ) : (
            <span className="text-xs text-muted">Checkout isn&apos;t enabled yet — use “Notify me” below.</span>
          )}
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted">Current plan</p>
          <p className="mt-1 font-display text-2xl font-medium">{limits.name}</p>
          <p className="mt-1 text-xs text-muted">Default access for early users</p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted"><Coins className="size-3.5" /> Credits remaining</p>
          <p className="mt-1 font-display text-2xl font-medium tabular">{state.credits} <span className="text-base text-muted">/ {allowance}</span></p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/5" role="progressbar" aria-valuenow={state.credits} aria-valuemin={0} aria-valuemax={allowance} aria-label="Credits remaining">
            <div className={cn("h-full rounded-full", state.credits <= 10 ? "bg-warn" : "bg-accent")} style={{ width: `${Math.min(100, (state.credits / Math.max(1, allowance)) * 100)}%` }} />
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Used this period</p>
          <p className="mt-1 font-display text-2xl font-medium tabular">{used}</p>
          <p className="mt-1 text-xs text-muted">
            {me ? `Resets on ${new Date(me.credits.resets_on).toLocaleDateString()}. ` : "Resets monthly on your account anniversary. "}No rollover.
          </p>
        </Card>
      </div>

      {state.credits === 0 && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger">
          <strong>Credits exhausted.</strong> You can still browse, filter, use watchlists and Collections. Upgrade below, or wait for your monthly reset.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Plans</h2>
        <Segmented label="Billing cycle" value={cycle} options={["Monthly", "Yearly"] as const} onChange={setCycle} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {(Object.keys(PLAN_LIMITS) as PlanId[]).map((id) => {
          const p = PLAN_LIMITS[id];
          const current = id === state.plan;
          return (
            <Card key={id} className={cn("flex flex-col p-5", id === "visionary" && "border-accent")}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-medium">{p.name}</h3>
                {current ? <Badge tone="good">Current</Badge> : id === "visionary" ? <Badge tone="accent">Popular</Badge> : null}
              </div>
              <p className="mt-3 font-display text-3xl font-medium tabular">${cycle === "Monthly" ? p.monthly : p.yearly}<span className="text-sm text-muted">/mo</span></p>
              <ul className="mt-4 flex-1 space-y-2 text-[13px]">
                {[`${p.credits} credits / month`, `${p.workspaces} workspaces`, `${p.competitors} competitors per workspace`, `${p.verified} verified channels · ${p.refresh} refresh`, p.mcp && "MCP connector", p.api && "API access", p.guests && "Guest access"].filter(Boolean).map((f) => (
                  <li key={f as string} className="flex gap-2"><Check className="mt-0.5 size-4 flex-none text-accent" />{f}</li>
                ))}
              </ul>
              {current && subscribed ? (
                <Button className="mt-5" loading={pending === "portal"} onClick={manage}>Manage billing</Button>
              ) : current ? (
                <Button className="mt-5" disabled>Your current plan</Button>
              ) : billingReady && subscribed ? (
                <Button variant="primary" className="mt-5" loading={pending === "portal"} onClick={manage}>Switch plan</Button>
              ) : billingReady ? (
                <Button variant="accent" className="mt-5" loading={pending === id} onClick={() => upgrade(id)}>Upgrade — test checkout</Button>
              ) : (
                <Button
                  variant="primary"
                  className="mt-5"
                  onClick={async () => { if (await runAsync(() => joinWaitlist(id)) !== undefined) toast(`We'll email ${state.profile.email} when ${p.name} checkout opens`); }}
                >
                  {state.waitlist.includes(id) ? "On the list ✓" : "Notify me"}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
      {!billingReady && (
        <p className="text-xs text-muted">
          {live
            ? "Checkout isn't enabled on the server yet (BILLING_PROVIDER=stripe_test + price IDs). Plan buttons capture interest until then."
            : "Demo mode: connect Supabase and the API to enable Stripe test checkout. Plan buttons capture interest only."}
        </p>
      )}

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Credit history</h2>
        {live && history === null ? <p className="mt-2 text-sm text-muted">Loading…</p> : rows.length === 0 ? <p className="mt-2 text-sm text-muted">No credits used yet.</p> : (
          <ul className="mt-2 divide-y divide-line text-sm">
            {rows.slice(0, 15).map((e) => (
              <li key={e.key} className="flex justify-between py-2"><span>{e.action}</span><span className="text-muted tabular">{e.amount > 0 ? `+${e.amount}` : e.amount} · {ago(e.at)}</span></li>
            ))}
          </ul>
        )}
      </Card>

      {!live && <Card className="border-dashed p-4">
        <p className="text-sm font-semibold">Demo admin override</p>
        <p className="mt-1 text-xs text-muted">Local demo only. In production plans are changed by an admin in the backend (FR-BILL-09), never by the user.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(PLAN_LIMITS) as PlanId[]).map((id) => <Button key={id} onClick={() => { adminSetPlan(id); toast(`Plan set to ${PLAN_LIMITS[id].name}, credits reset`); }}>Set {PLAN_LIMITS[id].name}</Button>)}
        </div>
      </Card>}
    </div>
  );
}

function Profile() {
  const { state, setProfile, toast } = useStore();
  const runAsync = useAsyncAction();
  const [name, setName] = useState(state.profile.name);
  const [saving, setSaving] = useState(false);
  return (
    <Card className="max-w-lg space-y-4 p-5">
      <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
      <Field label="Email" hint="Changing your email isn't supported yet."><Input value={state.profile.email} readOnly disabled /></Field>
      <div className="flex items-center gap-2 rounded-lg bg-surface-2 p-3 text-xs text-muted"><KeyRound className="size-4" /> Passkey sign-in is planned for a later release. Two-factor authentication isn&apos;t available in this version.</div>
      <Button
        variant="primary"
        loading={saving}
        disabled={!name.trim() || name === state.profile.name}
        onClick={async () => {
          setSaving(true);
          const ok = await runAsync(async () => { await setProfile({ ...state.profile, name: name.trim() }); return true; });
          setSaving(false);
          if (ok) toast("Profile saved");
        }}
      >
        Save
      </Button>
    </Card>
  );
}

function SocialVerification() {
  const { state, startVerification, completeVerification, removeSocial, limits, toast } = useStore();
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [handle, setHandle] = useState("");
  const [checking, setChecking] = useState<string | null>(null);
  const verified = state.social.filter((s) => s.status === "verified").length;
  const clean = handle.replace(/^@/, "").trim();

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <Card className="h-fit space-y-4 p-5">
        <ol className="space-y-1 text-sm text-muted">
          <li>1. Pick a platform and enter your handle</li><li>2. Generate a code and paste it anywhere in your bio</li><li>3. Click verify — usually done within a minute</li>
        </ol>
        <Field label="Platform">
          <Select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="youtube">YouTube</option></Select>
        </Field>
        <Field label="Handle"><Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourhandle" /></Field>
        <Button variant="primary" disabled={!clean || verified >= limits.verified} onClick={() => { startVerification(platform, clean); setHandle(""); }}>Generate code</Button>
        <p className="text-xs text-muted">{verified} of {limits.verified} verified channels on your plan. We never ask for your password.</p>
      </Card>
      <div className="space-y-3">
        {state.social.length === 0 && <Card className="p-5 text-sm text-muted">No accounts yet.</Card>}
        {state.social.map((s) => {
          const key = `${s.platform}:${s.handle}`;
          return (
            <Card key={key} className="p-4">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={s.platform} className="size-4" />
                <span className="flex-1 font-semibold">@{s.handle}</span>
                {s.status === "verified" ? <Badge tone="good"><BadgeCheck className="size-3" /> Verified</Badge> : <Badge tone="warn">Pending</Badge>}
                <button aria-label={`Remove @${s.handle}`} className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-black/5" onClick={() => removeSocial(s.platform, s.handle)}><Trash2 className="size-4" /></button>
              </div>
              {s.status === "pending" && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-surface-2 p-3">
                    <code className="flex-1 font-mono text-base font-semibold tracking-wider">{s.code}</code>
                    <Button onClick={() => { navigator.clipboard.writeText(s.code); toast("Code copied"); }}><Copy className="size-4" /> Copy</Button>
                  </div>
                  <Button
                    variant="primary"
                    loading={checking === key}
                    onClick={() => { setChecking(key); setTimeout(() => { completeVerification(s.platform, s.handle); setChecking(null); toast(`@${s.handle} verified — your dashboard is ready`); }, 1800); }}
                  >
                    {checking === key ? "Checking bio…" : "I've added it — verify"}
                  </Button>
                  <p className="text-xs text-muted">Demo: verification succeeds automatically. The backend checks the live bio in Phase 5.</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Workspaces() {
  const store = useStore();
  const { state, limits } = store;
  const runAsync = useAsyncAction();
  const renameWorkspace = (id: string, name: string) => void runAsync(() => store.renameWorkspace(id, name));
  const setWorkspaceActive = (id: string, on: boolean) => void runAsync(() => store.setWorkspaceActive(id, on));
  const [edit, setEdit] = useState<Record<string, string>>({});
  const active = state.workspaces.filter((w) => w.active).length;
  return (
    <Card className="px-4">
      <p className="border-b border-line py-3 text-xs text-muted">{active} of {limits.workspaces} active workspaces · Members and guest access ({limits.guests ? "available" : "Titan only"}) arrive with team accounts.</p>
      <ul className="divide-y divide-line">
        {state.workspaces.map((w) => (
          <li key={w.id} className="flex flex-wrap items-center gap-2 py-3">
            <label className="sr-only" htmlFor={`ws-${w.id}`}>Workspace name</label>
            <Input id={`ws-${w.id}`} className="max-w-xs" value={edit[w.id] ?? w.name} onChange={(e) => setEdit({ ...edit, [w.id]: e.target.value })} disabled={!w.active} />
            {edit[w.id] && edit[w.id] !== w.name && <Button onClick={() => { renameWorkspace(w.id, edit[w.id].trim() || w.name); setEdit({ ...edit, [w.id]: "" }); }}>Rename</Button>}
            {w.id === state.activeId && <Badge tone="accent">Current</Badge>}
            {!w.active && <Badge>Deactivated</Badge>}
            <span className="ml-auto" />
            {w.active ? (
              <Button variant="ghost" disabled={active <= 1} onClick={() => setWorkspaceActive(w.id, false)}>Deactivate</Button>
            ) : (
              <Button variant="ghost" disabled={active >= limits.workspaces} onClick={() => setWorkspaceActive(w.id, true)}>Reactivate</Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function FeatureFlags() {
  const { state, setFlag, resetDemo, toast } = useStore();
  const flags: Array<[string, string, string]> = [
    ["betaReports", "Reports (beta)", "Generate structured reports from analyzed videos."],
    ["compactCards", "Compact video cards", "Show more videos per row."],
    ["simulateFailures", "Simulate AI failures", "Half of analyses fail so you can test retries (no credit is charged)."],
  ];
  return (
    <Card className="px-4">
      <ul className="divide-y divide-line">
        {flags.map(([k, label, desc]) => (
          <li key={k} className="flex items-center gap-4 py-4">
            <div className="flex-1"><p className="text-sm font-semibold">{label}</p><p className="text-xs text-muted">{desc}</p></div>
            <button
              role="switch"
              aria-checked={!!state.flags[k]}
              aria-label={label}
              onClick={() => setFlag(k, !state.flags[k])}
              className={cn("relative h-6 w-11 cursor-pointer rounded-full transition", state.flags[k] ? "bg-accent" : "bg-black/15")}
            >
              <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition", state.flags[k] ? "left-[22px]" : "left-0.5")} />
            </button>
          </li>
        ))}
        <li className="flex items-center gap-4 py-4">
          <div className="flex-1"><p className="text-sm font-semibold">Reset demo data</p><p className="text-xs text-muted">Clears everything stored in this browser.</p></div>
          <Button variant="danger" onClick={() => { resetDemo(); toast("Demo data reset"); }}>Reset</Button>
        </li>
      </ul>
    </Card>
  );
}

function Connectors() {
  const { state, limits, toast } = useStore();
  const [perm, setPerm] = useState<Record<string, string>>({});
  const tools = ["analyze", "channels-add", "channels-recap", "channels-search", "channels-suggest", "topic", "formats-watchlist", "hooks-watchlist", "video-suggest", "videos-watchlist"];
  const [connecting, setConnecting] = useState(false);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 flex-none place-items-center rounded-lg bg-accent-soft text-accent"><Plug className="size-5" /></span>
          <div className="flex-1">
            <p className="font-semibold">Claude (MCP)</p>
            <p className="text-sm text-muted">Use your Smart Content data inside Claude and other MCP clients.</p>
          </div>
          {state.mcpEnabled ? <Badge tone="good">Enabled for your account</Badge> : <Badge><Lock className="size-3" /> Early access</Badge>}
        </div>
        {state.mcpEnabled ? (
          <div className="mt-4 space-y-3">
            <ol className="space-y-1 text-sm text-muted">
              <li>1. In Claude, open Settings → Connectors → Add custom connector</li>
              <li>2. Paste the server URL below and approve access once</li>
              <li>3. Set tool permissions here, then ask Claude about your niche</li>
            </ol>
            <div className="flex items-center gap-2 rounded-lg bg-surface-2 p-3">
              <code className="flex-1 truncate text-sm">{MCP_URL}</code>
              <Button onClick={() => { navigator.clipboard.writeText(MCP_URL); toast("Server URL copied"); }}><Copy className="size-4" /> Copy</Button>
            </div>
            <Button variant="primary" loading={connecting} onClick={() => { setConnecting(true); setTimeout(() => { setConnecting(false); toast("Authorization opens once the MCP server is deployed (Phase 5)", "error"); }, 900); }}>
              {connecting ? <Loader2 className="size-4 animate-spin" /> : null} Test connection
            </Button>
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-surface-2 p-3 text-sm text-muted">MCP is enabled by our team for Pro, Visionary and Titan early-access accounts. Your plan: {limits.name}. Contact support to request access.</p>
        )}
      </Card>

      {state.mcpEnabled && (
        <Card className="px-4">
          <p className="border-b border-line py-3 text-sm font-semibold">Tool permissions</p>
          <ul className="divide-y divide-line">
            {tools.map((t) => (
              <li key={t} className="flex items-center gap-3 py-2.5">
                <code className="flex-1 text-sm">/{t}</code>
                <Select aria-label={`Permission for /${t}`} className="w-44" value={perm[t] ?? "Always allow"} onChange={(e) => { setPerm({ ...perm, [t]: e.target.value }); toast(`/${t}: ${e.target.value}`); }}>
                  <option>Always allow</option><option>Needs approval</option><option>Blocked</option><option>Custom</option>
                </Select>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5 opacity-80">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-surface-2 text-muted"><ShieldCheck className="size-5" /></span>
          <div className="flex-1"><p className="font-semibold">API access</p><p className="text-sm text-muted">REST API keys for Titan accounts.</p></div>
          <Badge>Coming soon</Badge>
        </div>
      </Card>
    </div>
  );
}

export function SettingsView() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = (TABS as readonly string[]).includes(params.get("tab") ?? "") ? (params.get("tab") as Tab) : "Subscription";
  const [tab, setTab] = useState<Tab>(initial);
  const run = useAction();
  void run;

  return (
    <>
      <PageHeader title="Settings" />
      <Tabs value={tab} options={TABS} onChange={(t) => { setTab(t); router.replace(`/settings?tab=${encodeURIComponent(t)}`, { scroll: false }); }} />
      <div className="mt-5">
        {tab === "Subscription" && <Subscription />}
        {tab === "Profile" && <Profile />}
        {tab === "Social verification" && <SocialVerification />}
        {tab === "Workspaces" && <Workspaces />}
        {tab === "Feature flags" && <FeatureFlags />}
        {tab === "Connectors" && <Connectors />}
      </div>
    </>
  );
}
