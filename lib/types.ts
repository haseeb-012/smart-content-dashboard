// Domain types. These mirror the planned backend /api/v1 contract (see smart-content-backend/docs).
export type Platform = "tiktok" | "instagram" | "youtube";
export type PlanId = "pro" | "visionary" | "titan";

export interface Workspace { id: string; name: string; active: boolean }

export interface Channel {
  id: string; handle: string; name: string; platform: Platform;
  followers: number; totalViews: number; color: string; watchlist?: string; verified?: boolean;
}

export interface Video {
  id: string; channelId: string; platform: Platform; title: string; caption: string;
  postedAt: string; views: number; likes: number; comments: number; engagement: number;
  outlier: number; durationSec: number; hue: string;
}

export type AnalysisStatus = "queued" | "processing" | "complete" | "failed";
export interface Analysis {
  videoId: string; status: AnalysisStatus; startedAt: number; error?: string;
  summary?: string; transcript?: Array<{ t: string; text: string }>; idea?: string; hook?: string;
  format?: string; visual?: string;
}

export interface Idea {
  id: string; videoId: string; title: string; positioning: string; format: string;
  contrast: string; personalization: string; shortlisted: boolean; createdAt: string;
}

export type HookCategory = "Contrarian" | "Curiosity gap" | "Question" | "Unexpected claim" | "Problem";
export interface Hook { id: string; text: string; category: HookCategory; niche: string; views: number }

export interface ScriptBlocks { hook: string; intro: string; main: string; story: string; cta: string; ending: string }
export interface Script {
  id: string; title: string; sourceVideoId?: string; sourceIdeaId?: string; blocks: ScriptBlocks;
  versions: Array<{ at: string; blocks: ScriptBlocks }>; expanded: boolean; updatedAt: string; projectId?: string;
}

export interface Project { id: string; name: string; description: string; createdAt: string; items: Array<{ kind: "video" | "idea" | "script"; id: string }> }

export interface Collection {
  slug: string; name: string; category: "Formats" | "Editing Styles" | "Visual Hooks" | "Signature Series";
  sub: string; description: string; breakdown: string[]; videoIds: string[]; hue: string;
}

export interface ExportRecord { id: string; kind: string; title: string; format: string; at: string }

export interface CreditEvent { key: string; action: string; amount: number; at: string }

export interface SocialAccount { platform: Platform; handle: string; code: string; status: "pending" | "verified" }
