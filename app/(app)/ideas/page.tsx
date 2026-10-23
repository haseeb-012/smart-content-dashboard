"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, Lightbulb, Star, Trash2 } from "lucide-react";
import { useAction, useStore } from "@/lib/store";
import { videos } from "@/lib/mock/data";
import { cn, compact } from "@/lib/utils";
import { Button, ButtonLink, Card, CreditCost, EmptyState, MetricChips, PageHeader, Segmented } from "@/components/ui";
import { VideoThumb } from "@/components/features/video-card";

export default function IdeasPage() {
  const { ws, allChannels, toggleShortlist, removeIdea, createScript, state } = useStore();
  const run = useAction();
  const router = useRouter();
  const [view, setView] = useState<"All" | "Shortlisted">("All");
  const list = ws.ideas.filter((i) => view === "All" || i.shortlisted);

  return (
    <>
      <PageHeader
        title="Ideas"
        subtitle="Generated automatically from every video you analyze — no extra credit"
        actions={<Segmented label="Ideas view" value={view} options={["All", "Shortlisted"] as const} onChange={setView} />}
      />
      {list.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title={view === "Shortlisted" ? "No shortlisted ideas" : "No ideas yet"}
          body={view === "Shortlisted" ? "Star ideas you want to come back to." : "Analyze an outlier video and an idea based on it will appear here."}
          action={<ButtonLink href="/videos" variant="primary">Find a video</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((idea) => {
            const v = videos.find((x) => x.id === idea.videoId)!;
            const ch = allChannels.find((c) => c.id === v.channelId);
            return (
              <Card key={idea.id} className="flex gap-4 p-4">
                <Link href={`/videos/${v.id}`} className="w-24 flex-none"><VideoThumb video={v} /></Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <h2 className="flex-1 font-display text-[17px] font-medium leading-6">{idea.title}</h2>
                    <button
                      onClick={() => toggleShortlist(idea.id)}
                      aria-pressed={idea.shortlisted}
                      aria-label={idea.shortlisted ? "Remove from shortlist" : "Add to shortlist"}
                      className="grid size-9 cursor-pointer place-items-center rounded-lg hover:bg-black/5"
                    >
                      <Star className={cn("size-4", idea.shortlisted ? "fill-amber-400 text-amber-500" : "text-subtle")} />
                    </button>
                  </div>
                  <p className="text-xs text-muted">From @{ch?.handle} · {compact(v.views)} views</p>
                  <div className="mt-2"><MetricChips score={v.outlier} views={v.views} engagement={v.engagement} /></div>
                  <dl className="mt-3 grid gap-2 text-[13px]">
                    {[["Positioning", idea.positioning], ["Storytelling format", idea.format], ["Contrast", idea.contrast], ["Make it yours", idea.personalization]].map(([k, val]) => (
                      <div key={k}><dt className="text-[11px] font-semibold uppercase tracking-wide text-subtle">{k}</dt><dd>{val}</dd></div>
                    ))}
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      disabled={state.credits < 1}
                      onClick={() => {
                        const sid = run(() => createScript({ title: idea.title, topic: v.title, sourceVideoId: v.id, sourceIdeaId: idea.id }));
                        if (sid) router.push(`/scripts/${sid}`);
                      }}
                    >
                      <FileText className="size-4" /> Write script <CreditCost />
                    </Button>
                    <Button variant="ghost" onClick={() => removeIdea(idea.id)} aria-label="Delete idea"><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
