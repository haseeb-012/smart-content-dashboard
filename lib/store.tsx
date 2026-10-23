"use client";

// Client app state.
// LIVE mode (Supabase + API configured): identity, workspaces, plan, credits and billing come from
// the FastAPI backend (/api/v1) — the server is the source of truth. Research/creation modules that
// don't have backend endpoints yet (Phase 5) keep their data locally per workspace.
// DEMO mode: everything is local (localStorage) and PRD rules are simulated here:
// - credits deducted only on success, idempotent per key (FR-BILL-02/03)
// - plan limits on workspaces and competitors (FR-WS-04, FR-CH-04)
// - ideas auto-generated after analysis at no cost (FR-IDEA-01); script expand is free (FR-SCR-03)
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  Analysis, Channel, CreditEvent, ExportRecord, Idea, PlanId, Project, Script, ScriptBlocks, SocialAccount, Workspace,
} from "@/lib/types";
import { channels as seedChannels, PLAN_LIMITS, videos } from "@/lib/mock/data";
import { buildAnalysis, buildIdea, buildScript, expandScript } from "@/lib/generate";
import { uid } from "@/lib/utils";
import { LIVE } from "@/lib/config";
import { api, ApiError, type ApiMe, type Cycle } from "@/lib/api/client";
import { supabaseBrowser } from "@/lib/supabase/client";

interface WorkspaceData {
  channelIds: string[];
  extraChannels: Channel[];
  library: string[];
  analyses: Record<string, Analysis>;
  ideas: Idea[];
  scripts: Script[];
  projects: Project[];
  savedHooks: string[];
  exports: ExportRecord[];
}

interface State {
  workspaces: Workspace[];
  activeId: string;
  data: Record<string, WorkspaceData>;
  plan: PlanId;
  credits: number;
  creditLog: CreditEvent[];
  mcpEnabled: boolean;
  profile: { name: string; email: string };
  social: SocialAccount[];
  flags: Record<string, boolean>;
  waitlist: string[];
}

const emptyWs = (withSeed = false): WorkspaceData => ({
  channelIds: withSeed ? seedChannels.slice(0, 8).map((c) => c.id) : [],
  extraChannels: [],
  library: withSeed ? ["v_3", "v_7", "v_12"] : [],
  analyses: {},
  ideas: [],
  scripts: [],
  projects: withSeed ? [{ id: "p_1", name: "Q4 content plan", description: "Ideas and scripts for November.", createdAt: "2026-10-01T00:00:00Z", items: [] }] : [],
  savedHooks: [],
  exports: [],
});

const initial: State = {
  workspaces: [{ id: "ws_1", name: "My workspace", active: true }],
  activeId: "ws_1",
  data: { ws_1: emptyWs(true) },
  plan: "pro",
  credits: PLAN_LIMITS.pro.credits,
  creditLog: [],
  mcpEnabled: false,
  profile: { name: "Demo Creator", email: "demo@smartcontent.example" },
  social: [],
  flags: { compactCards: false, betaReports: true, simulateFailures: false },
  waitlist: [],
};

const KEY = "smartcontent.v1";

export class AppError extends Error {
  constructor(public code: "credits_exhausted" | "plan_limit" | "not_found", message: string) { super(message); }
}

type Toast = { id: string; text: string; tone: "ok" | "error" };

/** Saved browser state. In live mode identity/workspaces are dropped and re-fetched from the server. */
function loadSaved(): State {
  const liveEmpty: State = { ...initial, workspaces: [], activeId: "", data: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return LIVE ? liveEmpty : initial;
    const saved = JSON.parse(raw) as State;
    if (!LIVE) return { ...initial, ...saved };
    return { ...liveEmpty, data: saved.data ?? {}, activeId: saved.activeId ?? "", social: saved.social ?? [], flags: saved.flags ?? initial.flags };
  } catch {
    return LIVE ? liveEmpty : initial;
  }
}

function useAppState() {
  const [state, setState] = useState<State>(initial);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<number[]>([]);

  const [me, setMe] = useState<ApiMe | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  /** Pull identity, plan, credits and workspaces from the backend and merge into local state. */
  const syncFromServer = useCallback(async () => {
    if (!LIVE) return;
    try {
      const [m, wss] = await Promise.all([api.me(), api.workspaces()]);
      setMe(m);
      setServerError(null);
      setState((s) => {
        const workspaces = wss.map((w) => ({ id: w.id, name: w.name, active: w.is_active }));
        const stillThere = workspaces.some((w) => w.id === s.activeId && w.active);
        const activeId = stillThere ? s.activeId : workspaces.find((w) => w.active)?.id ?? "";
        const data = { ...s.data };
        for (const w of workspaces) data[w.id] ??= emptyWs(true);
        return {
          ...s,
          workspaces,
          activeId,
          data,
          plan: m.profile.plan,
          credits: m.credits.remaining,
          mcpEnabled: m.profile.mcp_enabled,
          profile: { name: m.profile.full_name ?? m.profile.email?.split("@")[0] ?? "Creator", email: m.profile.email ?? "" },
        };
      });
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Couldn't load your account.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser storage
    setState(loadSaved());
    if (LIVE) void syncFromServer().finally(() => setHydrated(true));
    else setHydrated(true);
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, [syncFromServer]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }, [state, hydrated]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = uid("t");
    setToasts((t) => [...t, { id, text, tone }]);
    timers.current.push(window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000));
  }, []);

  const ws = state.data[state.activeId] ?? emptyWs();
  const limits = PLAN_LIMITS[state.plan];
  const allChannels = useMemo(() => [...seedChannels, ...ws.extraChannels], [ws.extraChannels]);

  const patchWs = useCallback((fn: (d: WorkspaceData) => WorkspaceData) => {
    setState((s) => ({ ...s, data: { ...s.data, [s.activeId]: fn(s.data[s.activeId] ?? emptyWs()) } }));
  }, []);

  /** Idempotent credit charge — call only after the action succeeded. */
  const charge = useCallback((key: string, action: string) => {
    // Live mode: the backend owns the ledger. Chargeable endpoints arrive in Phase 5; until then
    // local demo actions don't touch real credits.
    if (LIVE) return;
    setState((s) => {
      if (s.creditLog.some((e) => e.key === key)) return s;
      return { ...s, credits: Math.max(0, s.credits - 1), creditLog: [{ key, action, amount: 1, at: new Date().toISOString() }, ...s.creditLog] };
    });
  }, []);

  const requireCredit = useCallback(() => {
    if (state.credits < 1) throw new AppError("credits_exhausted", "You're out of credits. They reset on your monthly renewal date.");
  }, [state.credits]);

  // ---------- Workspaces ----------
  const createWorkspace = async (name: string): Promise<string> => {
    if (LIVE) {
      const w = await api.createWorkspace(name); // server enforces the plan limit (plan_limit error)
      setState((s) => ({ ...s, data: { ...s.data, [w.id]: emptyWs() }, activeId: w.id }));
      await syncFromServer();
      setState((s) => ({ ...s, activeId: w.id }));
      return w.id;
    }
    const active = state.workspaces.filter((w) => w.active).length;
    if (active >= limits.workspaces) throw new AppError("plan_limit", `Your ${limits.name} plan allows ${limits.workspaces} workspaces.`);
    const id = uid("ws");
    setState((s) => ({ ...s, workspaces: [...s.workspaces, { id, name, active: true }], data: { ...s.data, [id]: emptyWs() }, activeId: id }));
    return id;
  };
  const renameWorkspace = async (id: string, name: string) => {
    if (LIVE) {
      await api.updateWorkspace(id, { name });
      return syncFromServer();
    }
    setState((s) => ({ ...s, workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name } : w)) }));
  };
  const setWorkspaceActive = async (id: string, active: boolean) => {
    if (LIVE) {
      await api.updateWorkspace(id, { is_active: active });
      return syncFromServer();
    }
    setState((s) => {
      const workspaces = s.workspaces.map((w) => (w.id === id ? { ...w, active } : w));
      const activeId = !active && s.activeId === id ? workspaces.find((w) => w.active)?.id ?? s.activeId : s.activeId;
      return { ...s, workspaces, activeId };
    });
  };
  const switchWorkspace = (id: string) => setState((s) => ({ ...s, activeId: id }));

  // ---------- Channels ----------
  const addChannel = (ch: Channel) => {
    if (ws.channelIds.includes(ch.id)) return;
    if (ws.channelIds.length >= limits.competitors) throw new AppError("plan_limit", `You can track up to ${limits.competitors} channels per workspace.`);
    patchWs((d) => ({
      ...d,
      channelIds: [...d.channelIds, ch.id],
      extraChannels: seedChannels.some((c) => c.id === ch.id) || d.extraChannels.some((c) => c.id === ch.id) ? d.extraChannels : [...d.extraChannels, ch],
    }));
  };
  const removeChannel = (id: string) => patchWs((d) => ({ ...d, channelIds: d.channelIds.filter((x) => x !== id) }));

  // ---------- Library ----------
  const toggleLibrary = (videoId: string) =>
    patchWs((d) => ({ ...d, library: d.library.includes(videoId) ? d.library.filter((x) => x !== videoId) : [...d.library, videoId] }));

  // ---------- Analysis (async: queued → processing → complete) ----------
  const analyze = (videoId: string) => {
    const existing = ws.analyses[videoId];
    if (existing && existing.status !== "failed") return;
    requireCredit();
    const v = videos.find((x) => x.id === videoId);
    const ch = allChannels.find((c) => c.id === v?.channelId);
    if (!v || !ch) throw new AppError("not_found", "Video not found.");
    const wsId = state.activeId;
    const set = (a: Partial<Analysis>) =>
      setState((s) => {
        const d = s.data[wsId] ?? emptyWs();
        return { ...s, data: { ...s.data, [wsId]: { ...d, analyses: { ...d.analyses, [videoId]: { ...d.analyses[videoId], ...a } as Analysis } } } };
      });
    set({ videoId, status: "queued", startedAt: Date.now(), error: undefined });
    timers.current.push(window.setTimeout(() => set({ status: "processing" }), 900));
    timers.current.push(
      window.setTimeout(() => {
        if (state.flags.simulateFailures && Math.random() < 0.5) {
          set({ status: "failed", error: "The AI provider timed out. No credit was used — try again." });
          return;
        }
        set({ status: "complete", ...buildAnalysis(v, ch) });
        charge(`analysis:${wsId}:${videoId}`, "Video analysis");
        setState((s) => {
          const d = s.data[wsId] ?? emptyWs();
          if (d.ideas.some((i) => i.videoId === videoId)) return s;
          return { ...s, data: { ...s.data, [wsId]: { ...d, ideas: [buildIdea(v, ch), ...d.ideas], library: d.library.includes(videoId) ? d.library : [...d.library, videoId] } } };
        });
        toast("Analysis complete — 1 credit used. An idea was added to Ideas.");
      }, 3200),
    );
  };

  // ---------- Ideas ----------
  const toggleShortlist = (id: string) =>
    patchWs((d) => ({ ...d, ideas: d.ideas.map((i) => (i.id === id ? { ...i, shortlisted: !i.shortlisted } : i)) }));
  const removeIdea = (id: string) => patchWs((d) => ({ ...d, ideas: d.ideas.filter((i) => i.id !== id) }));

  // ---------- Scripts ----------
  const createScript = (opts: { title: string; topic: string; hook?: string; sourceVideoId?: string; sourceIdeaId?: string }) => {
    requireCredit();
    const id = uid("scr");
    const blocks = buildScript(opts.topic, opts.hook);
    const now = new Date().toISOString();
    patchWs((d) => ({
      ...d,
      scripts: [{ id, title: opts.title, sourceVideoId: opts.sourceVideoId, sourceIdeaId: opts.sourceIdeaId, blocks, versions: [{ at: now, blocks }], expanded: false, updatedAt: now }, ...d.scripts],
    }));
    charge(`script:${state.activeId}:${id}`, "Script generation");
    return id;
  };
  const saveScript = (id: string, title: string, blocks: ScriptBlocks) =>
    patchWs((d) => ({
      ...d,
      scripts: d.scripts.map((s) => {
        if (s.id !== id) return s;
        const now = new Date().toISOString();
        return { ...s, title, blocks, updatedAt: now, versions: [{ at: now, blocks }, ...s.versions].slice(0, 20) };
      }),
    }));
  const expand = (id: string) =>
    patchWs((d) => ({ ...d, scripts: d.scripts.map((s) => (s.id === id ? { ...s, blocks: expandScript(s.blocks), expanded: true, updatedAt: new Date().toISOString() } : s)) }));
  const deleteScript = (id: string) => patchWs((d) => ({ ...d, scripts: d.scripts.filter((s) => s.id !== id) }));

  // ---------- Hooks ----------
  const toggleHook = (text: string) =>
    patchWs((d) => ({ ...d, savedHooks: d.savedHooks.includes(text) ? d.savedHooks.filter((h) => h !== text) : [text, ...d.savedHooks] }));

  // ---------- Projects ----------
  const createProject = (name: string, description = "") => {
    const id = uid("p");
    patchWs((d) => ({ ...d, projects: [{ id, name, description, createdAt: new Date().toISOString(), items: [] }, ...d.projects] }));
    return id;
  };
  const addToProject = (projectId: string, item: Project["items"][number]) =>
    patchWs((d) => ({
      ...d,
      projects: d.projects.map((p) => {
        const without = { ...p, items: p.items.filter((i) => !(i.kind === item.kind && i.id === item.id)) };
        return p.id === projectId ? { ...without, items: [...without.items, item] } : without;
      }),
    }));
  const removeFromProject = (projectId: string, item: Project["items"][number]) =>
    patchWs((d) => ({ ...d, projects: d.projects.map((p) => (p.id === projectId ? { ...p, items: p.items.filter((i) => !(i.kind === item.kind && i.id === item.id)) } : p)) }));
  const deleteProject = (id: string) => patchWs((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== id) }));

  // ---------- Exports ----------
  const logExport = (kind: string, title: string, format: string) =>
    patchWs((d) => ({ ...d, exports: [{ id: uid("ex"), kind, title, format, at: new Date().toISOString() }, ...d.exports].slice(0, 50) }));

  // ---------- Settings ----------
  const setProfile = async (profile: State["profile"]) => {
    if (LIVE) {
      await api.updateMe(profile.name);
      return syncFromServer();
    }
    setState((s) => ({ ...s, profile }));
  };
  const setFlag = (k: string, v: boolean) => setState((s) => ({ ...s, flags: { ...s.flags, [k]: v } }));
  const startVerification = (platform: SocialAccount["platform"], handle: string) => {
    const code = `SC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setState((s) => ({ ...s, social: [...s.social.filter((a) => !(a.platform === platform && a.handle === handle)), { platform, handle, code, status: "pending" }] }));
    return code;
  };
  const completeVerification = (platform: SocialAccount["platform"], handle: string) =>
    setState((s) => ({ ...s, social: s.social.map((a) => (a.platform === platform && a.handle === handle ? { ...a, status: "verified" } : a)) }));
  const removeSocial = (platform: SocialAccount["platform"], handle: string) =>
    setState((s) => ({ ...s, social: s.social.filter((a) => !(a.platform === platform && a.handle === handle)) }));
  const joinWaitlist = async (plan: string) => {
    if (LIVE && state.profile.email) await api.waitlist(state.profile.email, plan as PlanId);
    setState((s) => ({ ...s, waitlist: s.waitlist.includes(plan) ? s.waitlist : [...s.waitlist, plan] }));
  };
  /** Demo-only stand-in for admin overrides (FR-BILL-09/10). Real admin lives in the backend. */
  const adminSetPlan = (plan: PlanId) => setState((s) => ({ ...s, plan, credits: PLAN_LIMITS[plan].credits, mcpEnabled: true }));
  const resetDemo = () => setState(initial);

  // ---------- Billing (Stripe test mode, via backend) ----------
  /** Redirects the browser to Stripe-hosted Checkout. */
  const startCheckout = async (plan: PlanId, cycle: Cycle) => {
    const { url } = await api.checkout(plan, cycle);
    window.location.assign(url);
  };
  /** Redirects to the Stripe Customer Portal (upgrade/downgrade/cancel/card). */
  const openPortal = async () => {
    const { url } = await api.portal();
    window.location.assign(url);
  };

  const signOut = async () => {
    if (LIVE) await supabaseBrowser().auth.signOut();
    // Full reload on purpose: clears all in-memory account state after sign-out.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  };

  return {
    state, hydrated, ws, limits, allChannels, toasts, toast,
    live: LIVE, me, serverError, refresh: syncFromServer,
    createWorkspace, renameWorkspace, setWorkspaceActive, switchWorkspace,
    addChannel, removeChannel, toggleLibrary, analyze, toggleShortlist, removeIdea,
    createScript, saveScript, expand, deleteScript, toggleHook,
    createProject, addToProject, removeFromProject, deleteProject, logExport,
    setProfile, setFlag, startVerification, completeVerification, removeSocial, joinWaitlist, adminSetPlan, resetDemo,
    startCheckout, openPortal, signOut,
  };
}

type Store = ReturnType<typeof useAppState>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useAppState();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

/** Runs an action and turns plan/credit errors into a toast instead of a crash. */
export function useAction() {
  const { toast } = useStore();
  return useCallback(
    <T,>(fn: () => T): T | undefined => {
      try {
        return fn();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Something went wrong", "error");
        return undefined;
      }
    },
    [toast],
  );
}

/** Async version: awaits the action, shows API/plan/credit errors as a toast, returns undefined on failure. */
export function useAsyncAction() {
  const { toast } = useStore();
  return useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await fn();
      } catch (e) {
        toast(e instanceof Error ? e.message : "Something went wrong", "error");
        return undefined;
      }
    },
    [toast],
  );
}
