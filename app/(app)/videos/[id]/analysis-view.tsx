"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle, ArrowLeft, Bookmark, BookmarkCheck, Clock, Copy, Download, ExternalLink, FileText, FolderPlus, Heart, Lightbulb, Loader2, MessageCircle,
  Sparkles, Trash2, Users,
} from "lucide-react";
import { videos, DEMO_NOW } from "@/lib/mock/data";
import { useAction, useStore } from "@/lib/store";
import { ago, cn, compact, download } from "@/lib/utils";
import { Avatar, Badge, Button, Card, CreditCost, MetricChips, Skeleton, Tabs } from "@/components/ui";
import { VideoThumb } from "@/components/features/video-card";
import { AddToProjectModal } from "@/components/features/add-to-project";

const TABS = ["Summary", "Transcript", "Caption", "Idea", "Hook", "Format", "Visual"] as const;
type Tab = (typeof TABS)[number];

function Stat({ icon: Icon, label, value }: { icon: typeof Heart; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <p className="flex items-center gap-1.5 text-[11px] text-muted"><Icon className="size-3.5" />{label}</p>
      <p className="mt-1 text-base font-semibold tabular">{value}</p>
    </div>
  );
}

export function AnalysisView({ id }: { id: string }) {
  const router = useRouter();
  const run = useAction();
  const store = useStore();
  const { ws, allChannels, analyze, toggleLibrary, createScript, toggleShortlist, logExport, toast, state } = store;
  const [tab, setTab] = useState<Tab>("Summary");
  const [proj, setProj] = useState(false);
  const v = videos.find((x) => x.id === id)!;
  const ch = allChannels.find((c) => c.id === v.channelId)!;
  const a = ws.analyses[id];
  const idea = ws.ideas.find((i) => i.videoId === id);
  const saved = ws.library.includes(id);
  const done = a?.status === "complete";

  const llmText = () =>
    [
      `# Video analysis: ${v.title}`,
      `Creator: @${ch.handle} (${ch.platform}, ${compact(ch.followers)} followers)`,
      `Performance: ${compact(v.views)} views · ${v.engagement}% engagement · ${v.outlier}x outlier score`,
      "", "## Summary", a?.summary ?? "", "", "## Hook", a?.hook ?? "", "", "## Format", a?.format ?? "", "", "## Visual", a?.visual ?? "",
      "", "## Idea", a?.idea ?? "", "", "## Transcript", ...(a?.transcript ?? []).map((l) => `[${l.t}] ${l.text}`),
    ].join("\n");

  const body = (() => {
    if (tab === "Caption") return <p className="whitespace-pre-wrap text-sm leading-6">{v.caption}</p>;
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
            <Button className="mt-3" onClick={() => run(() => analyze(id))}>Retry</Button>
          </div>
        </div>
      );
    if (!done)
      return (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" />
        </div>
      );
    if (tab === "Transcript")
      return (
        <div>
          <div className="mb-3 flex gap-2">
            <Button onClick={() => { download(`${v.id}-transcript.txt`, a.transcript!.map((l) => `[${l.t}] ${l.text}`).join("\n")); logExport("Transcript", v.title, "TXT"); }}>
              <Download className="size-4" /> .txt
            </Button>
            <Button onClick={() => { download(`${v.id}-transcript.json`, JSON.stringify({ videoId: v.id, segments: a.transcript }, null, 2), "application/json"); logExport("Transcript", v.title, "JSON"); }}>
              <Download className="size-4" /> .json
            </Button>
          </div>
          <ol className="space-y-2">
            {a.transcript!.map((l) => (
              <li key={l.t} className="flex gap-3 text-sm leading-6"><span className="w-10 flex-none font-mono text-xs leading-6 text-subtle">{l.t}</span>{l.text}</li>
            ))}
          </ol>
        </div>
      );
    const text = { Summary: a.summary, Idea: a.idea, Hook: a.hook, Format: a.format, Visual: a.visual }[tab];
    return (
      <div>
        <p className="text-sm leading-7">{text}</p>
        {tab === "Idea" && idea && (
          <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4 text-sm">
            <p className="font-semibold">{idea.title}</p>
            <p className="mt-1 text-muted">{idea.personalization}</p>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => toggleShortlist(idea.id)}>{idea.shortlisted ? "Shortlisted ✓" : "Shortlist idea"}</Button>
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
          <VideoThumb video={v} className="mx-auto max-w-[300px]" />
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Avatar name={ch.name} color={ch.color} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">@{ch.handle}</p>
                <p className="text-xs text-muted">{compact(ch.followers)} followers · {ago(v.postedAt, DEMO_NOW)}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <div>
            <h1 className="font-display text-2xl font-medium leading-8 tracking-[-0.02em]">{v.title}</h1>
            <div className="mt-2"><MetricChips size="md" score={v.outlier} views={v.views} engagement={v.engagement} /></div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <Stat icon={Sparkles} label="Outlier score" value={`${v.outlier}x`} />
            <Stat icon={ExternalLink} label="Views" value={compact(v.views)} />
            <Stat icon={Heart} label="Likes" value={compact(v.likes)} />
            <Stat icon={MessageCircle} label="Comments" value={compact(v.comments)} />
            <Stat icon={Users} label="Followers" value={compact(ch.followers)} />
            <Stat icon={Clock} label="Length" value={`${v.durationSec}s`} />
          </div>

          {/* Status + primary action */}
          <Card className="flex flex-wrap items-center gap-3 p-4">
            {!a || a.status === "failed" ? (
              <>
                <div className="flex-1 text-sm">
                  <p className="font-semibold">Deep analysis</p>
                  <p className="text-muted">You have {state.credits} credits left.</p>
                </div>
                <Button variant="accent" disabled={state.credits < 1} onClick={() => run(() => analyze(id))}>
                  <Sparkles className="size-4" /> Analyze video <CreditCost />
                </Button>
              </>
            ) : (
              <ol className="flex flex-1 items-center gap-2 text-[13px]" aria-label="Analysis progress">
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

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={!done || state.credits < 1}
              title={!done ? "Analyze the video first" : undefined}
              onClick={() => {
                const sid = run(() => createScript({ title: `Script — ${v.title}`, topic: v.title, sourceVideoId: v.id, sourceIdeaId: idea?.id }));
                if (sid) router.push(`/scripts/${sid}`);
              }}
            >
              <FileText className="size-4" /> Create script <CreditCost />
            </Button>
            <Button disabled={!idea} onClick={() => idea && toggleShortlist(idea.id)}><Lightbulb className="size-4" /> {idea?.shortlisted ? "Shortlisted" : "Shortlist idea"}</Button>
            <Button onClick={() => setProj(true)}><FolderPlus className="size-4" /> Add to project</Button>
            <Button disabled={!done} onClick={() => { toast("Format saved to your Hooks watchlist"); store.toggleHook(`Format: ${a?.format?.split(".")[0]}`); }}><Bookmark className="size-4" /> Save format</Button>
            <Button disabled={!done} onClick={() => { navigator.clipboard.writeText(llmText()); logExport("Export for LLM", v.title, "Text"); toast("Copied — paste it into any AI tool"); }}>
              <Copy className="size-4" /> Export for LLM
            </Button>
            <Button onClick={() => window.open(`/videos/${id}`, "_blank")}><ExternalLink className="size-4" /> Open in new tab</Button>
            <Button variant={saved ? "danger" : "secondary"} onClick={() => toggleLibrary(id)}>
              {saved ? <><Trash2 className="size-4" /> Remove from library</> : <><BookmarkCheck className="size-4" /> Save to library</>}
            </Button>
          </div>

          <Card className="p-0">
            <div className="px-4 pt-2"><Tabs value={tab} options={TABS} onChange={setTab} /></div>
            <div className="p-5">{body}</div>
          </Card>
          {done && <p className="flex items-center gap-1.5 text-xs text-muted"><Badge tone="good">Analyzed</Badge> Results are saved to this workspace.</p>}
        </div>
      </div>
      <AddToProjectModal open={proj} onClose={() => setProj(false)} item={{ kind: "video", id }} />
    </>
  );
}
