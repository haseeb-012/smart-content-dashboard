"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle, ArrowLeft, Bookmark, BookmarkCheck, Clock, FileText, FolderPlus, Copy, Download, ExternalLink, Eye, Heart, Lightbulb, Loader2, MessageCircle, Sparkles, TrendingUp, Users,
} from "lucide-react";
import { api, ApiError, type ApiVideoDetail } from "@/lib/api/client";
import { useStore } from "@/lib/store";
import { ago, cn, compact, download } from "@/lib/utils";
import { Avatar, Badge, Button, Card, CreditCost, EmptyState, PlatformIcon, Skeleton, Tabs } from "@/components/ui";
import { LiveAddToProject, NewScriptModal, useSavedHooks } from "@/components/features/live-create";

const TABS = ["Summary", "Transcript", "Caption", "Idea", "Hook", "Format", "Visual"] as const;
type Tab = (typeof TABS)[number];
const POLL_MS = 2500;
const color = (s: string) => `hsl(${[...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)} 65% 52%)`;
const HOOK_LABEL: Record<string, string> = {
  contrarian: "Contrarian", curiosity_gap: "Curiosity gap", question: "Question", unexpected_claim: "Unexpected claim", problem: "Problem", other: "Other",
};

function Stat({ icon: Icon, label, value }: { icon: typeof Heart; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <p className="flex items-center gap-1.5 text-[11px] text-muted"><Icon className="size-3.5" />{label}</p>
      <p className="mt-1 text-base font-semibold tabular">{value}</p>
    </div>
  );
}

/** Live Deep Analysis screen: video from the API, analysis runs on the server (1 credit, only on success). */
export function LiveAnalysis({ id }: { id: string }) {
  const router = useRouter();
  const { state, toast, refresh } = useStore();
  const ws = state.activeId;
  const [d, setD] = useState<ApiVideoDetail | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [tab, setTab] = useState<Tab>("Summary");
  const [starting, setStarting] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [projOpen, setProjOpen] = useState(false);
  const hooks = useSavedHooks();

  const load = useCallback(async () => {
    if (!ws) return;
    try {
      setD(await api.videoDetail(ws, id));
      setErr(null);
    } catch (e) {
      setErr(e instanceof ApiError ? e : new ApiError(0, "error", "Couldn't load this video."));
    }
  }, [ws, id]);

  useEffect(() => {
    let alive = true;
    if (ws) api.videoDetail(ws, id).then((r) => alive && setD(r)).catch((e) => alive && setErr(e instanceof ApiError ? e : new ApiError(0, "error", "Couldn't load this video.")));
    return () => { alive = false; };
  }, [ws, id]);

  const status = d?.analysis?.status;
  const running = status === "queued" || status === "processing";
  // Poll while the server is working; refresh credits once it finishes.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      if (!ws) return;
      try {
        const next = await api.videoDetail(ws, id);
        setD(next);
        const s = next.analysis?.status;
        if (s === "complete") { toast("Analysis complete — 1 credit used"); void refresh(); }
        if (s === "failed") toast(next.analysis?.error ?? "Analysis failed", "error");
      } catch { /* keep polling */ }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [running, ws, id, toast, refresh]);

  const start = async () => {
    if (!ws) return;
    setStarting(true);
    try {
      const a = await api.analyze(ws, id);
      setD((cur) => (cur ? { ...cur, analysis: a } : cur));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't start the analysis.", "error");
    } finally {
      setStarting(false);
    }
  };

  const shortlist = async () => {
    if (!ws || !d?.idea) return;
    try {
      const idea = await api.updateIdea(ws, d.idea.id, { shortlisted: !d.idea.shortlisted });
      setD({ ...d, idea });
      toast(idea.shortlisted ? "Idea shortlisted" : "Removed from shortlist");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't update the idea.", "error");
    }
  };

  if (err)
    return (
      <EmptyState
        icon={AlertCircle}
        title={err.status === 404 ? "Video not found" : "Couldn't load this video"}
        body={err.status === 404 ? "It may belong to a channel this workspace no longer tracks." : err.message}
        action={<Button onClick={() => void load()}>Try again</Button>}
      />
    );
  if (!d)
    return (
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]" aria-busy="true">
        <Skeleton className="aspect-[9/14] w-full max-w-[300px] rounded-xl" />
        <div className="space-y-3"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /></div>
      </div>
    );

  const { video: v, analysis: a, idea } = d;
  const ch = v.channel;
  const done = a?.status === "complete";
  const title = v.caption.split("\n")[0].slice(0, 140) || "Untitled video";
  const outlier = v.outlier_score != null ? `${v.outlier_score >= 10 ? Math.round(v.outlier_score) : v.outlier_score.toFixed(1)}x` : "—";

  const llmText = () =>
    [
      `# Video analysis: ${title}`,
      `Creator: @${ch.handle} (${v.platform}${ch.followers ? `, ${compact(ch.followers)} followers` : ""})`,
      `Performance: ${compact(v.views)} views · ${v.engagement_rate}% engagement · ${outlier} outlier score`,
      `Link: ${v.url}`,
      "", "## Summary", a?.summary ?? "", "", "## Hook", a?.hook ?? "", "", "## Format", a?.format ?? "", "", "## Visual", a?.visual ?? "",
      "", "## Idea", a?.idea ?? "", "", "## Transcript", ...(a?.transcript ?? []).map((l) => `[${l.t}] ${l.text}`),
    ].join("\n");

  const body = (() => {
    if (tab === "Caption") return <p className="whitespace-pre-wrap text-sm leading-6">{v.caption || "No caption."}</p>;
    if (!a)
      return (
        <div className="rounded-xl border border-dashed border-line bg-surface-2 p-8 text-center">
          <Sparkles className="mx-auto size-6 text-accent" />
          <p className="mt-3 font-medium">Run a deep analysis to unlock this tab</p>
          <p className="mt-1 text-sm text-muted">Summary, transcript, idea, hook, format and visual breakdown. Costs 1 credit — only charged if it succeeds.</p>
        </div>
      );
    if (a.status === "failed")
      return (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 flex-none" />
          <div>
            <p className="font-semibold">Analysis failed</p>
            <p>{a.error}</p>
            <Button className="mt-3" loading={starting} onClick={start}>Retry</Button>
          </div>
        </div>
      );
    if (!done)
      return (
        <div className="space-y-3" aria-busy="true">
          <p className="text-sm text-muted">The AI is watching the video — this usually takes under a minute.</p>
          <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" />
        </div>
      );
    if (tab === "Transcript")
      return a.transcript.length ? (
        <div>
          <div className="mb-3 flex gap-2">
            <Button onClick={() => download(`${v.id}-transcript.txt`, a.transcript.map((l) => `[${l.t}] ${l.text}`).join("\n"))}>
              <Download className="size-4" /> .txt
            </Button>
            <Button onClick={() => download(`${v.id}-transcript.json`, JSON.stringify({ videoId: v.id, url: v.url, segments: a.transcript }, null, 2), "application/json")}>
              <Download className="size-4" /> .json
            </Button>
          </div>
          <ol className="space-y-2">
            {a.transcript.map((l, i) => (
              <li key={`${l.t}-${i}`} className="flex gap-3 text-sm leading-6"><span className="w-12 flex-none font-mono text-xs leading-6 text-subtle">{l.t}</span>{l.text}</li>
            ))}
          </ol>
        </div>
      ) : <p className="text-sm text-muted">No speech or on-screen text was found in this video.</p>;
    const text = { Summary: a.summary, Idea: a.idea, Hook: a.hook, Format: a.format, Visual: a.visual }[tab];
    return (
      <div>
        {tab === "Hook" && a.hook_category && <Badge tone="accent" className="mb-2">{HOOK_LABEL[a.hook_category] ?? a.hook_category}</Badge>}
        <p className="whitespace-pre-wrap text-sm leading-7">{text}</p>
        {tab === "Idea" && idea && (
          <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4 text-sm">
            <p className="font-semibold">{idea.title}</p>
            <dl className="mt-2 grid gap-1 text-muted">
              <div><dt className="inline font-medium text-ink">Positioning: </dt><dd className="inline">{idea.positioning}</dd></div>
              <div><dt className="inline font-medium text-ink">Format: </dt><dd className="inline">{idea.format}</dd></div>
              <div><dt className="inline font-medium text-ink">Contrast: </dt><dd className="inline">{idea.contrast}</dd></div>
              <div><dt className="inline font-medium text-ink">Make it yours: </dt><dd className="inline">{idea.personalization}</dd></div>
            </dl>
            <div className="mt-3 flex gap-2">
              <Button onClick={shortlist}>{idea.shortlisted ? "Shortlisted ✓" : "Shortlist idea"}</Button>
              <Link href="/ideas" className="self-center text-sm font-semibold text-accent">Open in Ideas →</Link>
            </div>
          </div>
        )}
      </div>
    );
  })();

  return (
    <>
      <button onClick={() => router.back()} className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <a href={v.url} target="_blank" rel="noopener noreferrer" aria-label={`Watch on ${v.platform}`}
            className="relative mx-auto block aspect-[9/14] max-w-[300px] overflow-hidden rounded-xl bg-cover bg-center"
            style={v.thumbnail_url ? { backgroundImage: `url("${v.thumbnail_url}")` } : { backgroundImage: `linear-gradient(135deg, ${color(ch.handle)}, #0a1430)` }}>
            <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-md bg-white/95 text-ink shadow-sm"><PlatformIcon platform={v.platform} /></span>
            <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink">Watch original <ExternalLink className="size-3" /></span>
          </a>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Avatar name={ch.display_name || ch.handle} color={color(ch.handle)} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">@{ch.handle}</p>
                <p className="text-xs text-muted">{ch.followers != null ? `${compact(ch.followers)} followers · ` : ""}{v.posted_at ? ago(v.posted_at) : ""}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <h1 className="font-display text-2xl font-medium leading-8 tracking-[-0.02em]">{title}</h1>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <Stat icon={TrendingUp} label="Outlier score" value={outlier} />
            <Stat icon={Eye} label="Views" value={compact(v.views)} />
            <Stat icon={Heart} label="Likes" value={compact(v.likes)} />
            <Stat icon={MessageCircle} label="Comments" value={compact(v.comments)} />
            <Stat icon={Users} label="Followers" value={ch.followers != null ? compact(ch.followers) : "—"} />
            <Stat icon={Clock} label="Length" value={v.duration_sec != null ? `${v.duration_sec}s` : "—"} />
          </div>

          <Card className="flex flex-wrap items-center gap-3 p-4">
            {!a || a.status === "failed" ? (
              <>
                <div className="flex-1 text-sm">
                  <p className="font-semibold">Deep analysis</p>
                  <p className="text-muted">You have {state.credits} credits left. Charged only if it succeeds.</p>
                </div>
                <Button variant="accent" loading={starting} disabled={state.credits < 1} onClick={start}>
                  <Sparkles className="size-4" /> {a ? "Retry analysis" : "Analyze video"} <CreditCost />
                </Button>
              </>
            ) : (
              <ol className="flex flex-1 items-center gap-2 text-[13px]" aria-label="Analysis progress" aria-live="polite">
                {(["queued", "processing", "complete"] as const).map((s, i) => {
                  const order = { queued: 0, processing: 1, complete: 2, failed: -1 }[a.status];
                  const reached = order >= i;
                  return (
                    <li key={s} className="flex items-center gap-2">
                      <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold capitalize", reached ? (s === "complete" ? "bg-good-bg text-good" : "bg-accent-soft text-accent") : "bg-black/5 text-subtle")}>
                        {order === i && s !== "complete" && <Loader2 className="size-3.5 animate-spin" />}
                        {s}
                      </span>
                      {i < 2 && <span className="h-px w-6 bg-line" aria-hidden />}
                    </li>
                  );
                })}
              </ol>
            )}
            {state.credits < 1 && (!a || a.status === "failed") && (
              <p className="w-full text-xs text-danger">You&apos;re out of credits. Credits reset monthly — see Settings → Subscription.</p>
            )}
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button variant="primary" disabled={!done || state.credits < 1} title={!done ? "Analyze the video first" : undefined} onClick={() => setScriptOpen(true)}>
              <FileText className="size-4" /> Create script <CreditCost />
            </Button>
            <Button disabled={!done || !a?.hook} onClick={() => a?.hook && hooks.toggle(a.hook.slice(0, 300), (a.hook_category as never) ?? null, "analysis")}>
              {a?.hook && hooks.isSaved(a.hook.slice(0, 300)) ? <BookmarkCheck className="size-4 text-accent" /> : <Bookmark className="size-4" />} Save hook
            </Button>
            <Button onClick={() => setProjOpen(true)}><FolderPlus className="size-4" /> Add to project</Button>
            <Button disabled={!idea} onClick={shortlist}><Lightbulb className="size-4" /> {idea?.shortlisted ? "Shortlisted" : "Shortlist idea"}</Button>
            <Button disabled={!done} onClick={() => { void navigator.clipboard.writeText(llmText()); toast("Copied — paste it into any AI tool"); }}>
              <Copy className="size-4" /> Export for LLM
            </Button>
            <Button onClick={() => window.open(v.url, "_blank", "noopener,noreferrer")}><ExternalLink className="size-4" /> Open original</Button>
          </div>

          <Card className="p-0">
            <div className="px-4 pt-2"><Tabs value={tab} options={TABS} onChange={setTab} /></div>
            <div className="p-5">{body}</div>
          </Card>
          {done && <p className="flex items-center gap-1.5 text-xs text-muted"><Badge tone="good">Analyzed</Badge> Saved to this workspace — opening it again is free.</p>}
        </div>
      </div>
      {scriptOpen && <NewScriptModal open onClose={() => setScriptOpen(false)} preset={{ title: idea?.title ?? `Script — ${title.slice(0, 80)}`, topic: idea?.title ?? title, source_video_id: v.id, source_idea_id: idea?.id }} />}
      {projOpen && <LiveAddToProject open onClose={() => setProjOpen(false)} kind="video" refId={v.id} />}
    </>
  );
}
