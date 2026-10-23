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

export type ApiCollectionCategory = "formats" | "editing_styles" | "visual_hooks" | "signature_series";
export interface ApiCollectionSummary {
  id: string; slug: string; name: string; category: ApiCollectionCategory; sub: string; description: string;
  cover_hue: string; video_count: number; is_published: boolean; updated_at: string;
}
export interface ApiCollectionVideo {
  id: string; position: number; platform: "tiktok" | "instagram" | "youtube"; url: string; title: string;
  creator_handle: string; views: number | null; outlier_score: number | null; transcript: string; notes: string;
}
export interface ApiCollectionDetail extends ApiCollectionSummary { breakdown: string[]; videos: ApiCollectionVideo[] }

export type ApiPlatform = "tiktok" | "instagram" | "youtube";
export interface ApiChannel {
  id: string; platform: ApiPlatform; handle: string; display_name: string; avatar_url: string | null;
  followers: number | null; total_views: number | null; video_count: number;
  sync_status: "pending" | "ok" | "error"; sync_error: string | null; last_synced_at: string | null;
}
export interface ApiWatchlistItem extends ApiChannel { outlier_videos: number; added_at: string }
export interface ApiChannelSearchResult { platform: ApiPlatform; handle: string; display_name: string; followers: number | null; channel_id: string | null; tracked: boolean }
export interface ApiFeedVideo {
  id: string; platform: ApiPlatform; url: string; caption: string; thumbnail_url: string | null; posted_at: string | null;
  duration_sec: number | null; views: number; likes: number; comments: number; shares: number;
  engagement_rate: number; outlier_score: number | null; channel: ApiChannel;
}
export type ApiAnalysisStatus = "queued" | "processing" | "complete" | "failed";
export interface ApiAnalysis {
  id: string; video_id: string; status: ApiAnalysisStatus; error: string | null; provider: string | null; model: string | null;
  summary: string | null; transcript: Array<{ t: string; text: string }>; hook: string | null; hook_category: string | null;
  format: string | null; visual: string | null; idea: string | null; created_at: string; started_at: string | null; completed_at: string | null;
}
export interface ApiIdea {
  id: string; video_id: string | null; analysis_id: string | null; source: "analysis" | "generated" | "manual"; title: string;
  positioning: string; format: string; contrast: string; personalization: string; shortlisted: boolean; created_at: string;
}
export interface ApiVideoDetail { video: ApiFeedVideo; analysis: ApiAnalysis | null; idea: ApiIdea | null }
export interface FeedParams {
  channel_id?: string[]; platform?: ApiPlatform; min_outlier?: number; min_views?: number; max_views?: number;
  min_engagement?: number; posted_within_days?: number; q?: string; sort?: "outlier" | "views" | "engagement" | "newest";
  limit?: number; offset?: number;
}

function qs(params: object): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    // Skip empty values; 0 means "any" for filters (but offset=0 is meaningful).
    if (v === undefined || v === null || v === "" || (v === 0 && k !== "offset")) continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

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
  if (res.status === 204) return null as T;
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
  // Collections are public + free (no auth, no credits).
  collections: (p: { category?: ApiCollectionCategory; q?: string; sort?: "most_videos" | "name" | "recent" } = {}) => {
    const qs = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString();
    return request<ApiCollectionSummary[]>("GET", `/collections${qs ? `?${qs}` : ""}`, undefined, false);
  },
  collection: (slug: string) => request<ApiCollectionDetail>("GET", `/collections/${encodeURIComponent(slug)}`, undefined, false),
  collectionExportUrl: (slug: string, format: "markdown" | "json") =>
    `${API_URL}/api/v1/collections/${encodeURIComponent(slug)}/export?format=${format}`,
  // Channels watchlist + Discover feed (workspace-scoped, free).
  watchlist: (ws: string) => request<ApiWatchlistItem[]>("GET", `/workspaces/${ws}/channels`),
  addChannel: (ws: string, body: { url: string } | { platform: ApiPlatform; handle: string }) =>
    request<{ channel: ApiChannel; added: boolean }>("POST", `/workspaces/${ws}/channels`, body),
  removeChannel: (ws: string, channelId: string) => request<null>("DELETE", `/workspaces/${ws}/channels/${channelId}`),
  refreshChannel: (ws: string, channelId: string) => request<{ queued: boolean }>("POST", `/workspaces/${ws}/channels/${channelId}/refresh`),
  suggestedChannels: (ws: string) => request<ApiChannel[]>("GET", `/workspaces/${ws}/channels/suggested`),
  searchChannels: (ws: string, q: string, platform?: ApiPlatform) =>
    request<ApiChannelSearchResult[]>("GET", `/workspaces/${ws}/channels/search${qs({ q, platform })}`),
  feed: (ws: string, p: FeedParams) =>
    request<{ items: ApiFeedVideo[]; total: number; limit: number; offset: number }>("GET", `/workspaces/${ws}/videos${qs(p)}`),
  // Deep Analysis (1 credit, charged only on success) + ideas.
  videoDetail: (ws: string, videoId: string) => request<ApiVideoDetail>("GET", `/workspaces/${ws}/videos/${videoId}`),
  analyze: (ws: string, videoId: string) => request<ApiAnalysis>("POST", `/workspaces/${ws}/videos/${videoId}/analysis`),
  ideas: (ws: string, shortlisted?: boolean) => request<ApiIdea[]>("GET", `/workspaces/${ws}/ideas${qs({ shortlisted })}`),
  updateIdea: (ws: string, id: string, patch: { shortlisted?: boolean; title?: string }) => request<ApiIdea>("PATCH", `/workspaces/${ws}/ideas/${id}`, patch),
  deleteIdea: (ws: string, id: string) => request<null>("DELETE", `/workspaces/${ws}/ideas/${id}`),
  waitlist: (email: string, plan: PlanId) => request<{ ok: boolean; already_joined: boolean }>("POST", "/waitlist", { email, plan, source: "app" }, false),
};
