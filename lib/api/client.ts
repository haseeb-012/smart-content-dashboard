"use client";

// Typed client for the FastAPI backend (/api/v1). Mirrors docs/API_CONTRACTS.md (backend v1).
import { API_URL } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabase/client";

export type PlanId = "pro" | "visionary" | "titan";
export type Cycle = "monthly" | "yearly";

export interface ApiPlan {
  id: PlanId; name: string; credits: number; workspaces: number; competitors_per_workspace: number;
  verified_channels: number; refresh_hours: number; features: string[]; monthly_usd: number; yearly_usd: number;
}
export interface ApiCredits { allowance: number; used: number; adjustments: number; remaining: number; period_start: string; resets_on: string }
export interface ApiProfile { id: string; email: string | null; full_name: string | null; plan: PlanId; is_admin: boolean; mcp_enabled: boolean; created_at: string }
export interface ApiMe { profile: ApiProfile; plan: ApiPlan; credits: ApiCredits; billing: {
  provider: string; checkout_available: boolean; test_mode: boolean;
  subscription_status: "" | "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired";
  billing_cycle: "" | Cycle; has_billing_account: boolean;
} }
export interface ApiWorkspace { id: string; name: string; is_active: boolean; role: "owner" | "editor" | "guest"; created_at: string }
export interface ApiLedgerEntry { id: string; kind: "usage" | "adjustment"; amount: number; action: string; workspace_id: string | null; created_at: string }

/** Structured backend error: switch on `code`, never on the message. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details: Record<string, unknown> = {}) {
    super(message);
  }
}

async function token(): Promise<string | null> {
  const { data } = await supabaseBrowser().auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const t = await token();
    if (!t) throw new ApiError(401, "unauthorized", "Please sign in again.");
    headers.Authorization = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "network_error", "Can't reach the server. Check your connection and try again.");
  }
  if (res.ok) return (await res.json()) as T;
  let err: { code?: string; message?: string; details?: Record<string, unknown> } = {};
  try { err = (await res.json()).error ?? {}; } catch {}
  throw new ApiError(res.status, err.code ?? "error", err.message ?? `Request failed (${res.status}).`, err.details);
}

export const api = {
  me: () => request<ApiMe>("GET", "/me"),
  updateMe: (full_name: string) => request<ApiMe>("PATCH", "/me", { full_name }),
  plans: () => request<ApiPlan[]>("GET", "/plans", undefined, false),
  workspaces: () => request<ApiWorkspace[]>("GET", "/workspaces"),
  createWorkspace: (name: string) => request<ApiWorkspace>("POST", "/workspaces", { name }),
  updateWorkspace: (id: string, patch: { name?: string; is_active?: boolean }) => request<ApiWorkspace>("PATCH", `/workspaces/${id}`, patch),
  credits: () => request<ApiCredits>("GET", "/credits"),
  creditHistory: (limit = 50) => request<{ credits: ApiCredits; entries: ApiLedgerEntry[] }>("GET", `/credits/history?limit=${limit}`),
  checkout: (plan: PlanId, cycle: Cycle) => request<{ url: string }>("POST", "/billing/checkout-session", { plan, cycle }),
  portal: () => request<{ url: string }>("POST", "/billing/portal-session"),
  waitlist: (email: string, plan: PlanId) => request<{ ok: boolean; already_joined: boolean }>("POST", "/waitlist", { email, plan, source: "app" }, false),
};
