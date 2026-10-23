"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, BookmarkCheck, FolderPlus, Play } from "lucide-react";
import type { Video } from "@/lib/types";
import { useStore } from "@/lib/store";
import { ago, cn } from "@/lib/utils";
import { MetricChips, PlatformIcon } from "@/components/ui";
import { AddToProjectModal } from "@/components/features/add-to-project";
import { DEMO_NOW } from "@/lib/mock/data";

export function VideoThumb({ video, className, label }: { video: Video; className?: string; label?: string }) {
  return (
    <div className={cn("relative aspect-[9/14] overflow-hidden rounded-xl bg-gradient-to-br", video.hue, className)}>
      <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-md bg-white/95 text-ink shadow-sm">
        <PlatformIcon platform={video.platform} />
      </span>
      <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular">
        {Math.floor(video.durationSec / 60)}:{String(video.durationSec % 60).padStart(2, "0")}
      </span>
      {label && <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">{label}</span>}
      <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
        <span className="grid size-10 place-items-center rounded-full bg-white/90"><Play className="size-4 fill-current" /></span>
      </span>
    </div>
  );
}

export function VideoCard({ video }: { video: Video }) {
  const { allChannels, ws, toggleLibrary } = useStore();
  const [proj, setProj] = useState(false);
  const ch = allChannels.find((c) => c.id === video.channelId);
  const saved = ws.library.includes(video.id);
  const analysis = ws.analyses[video.id];

  return (
    <article className="group relative min-w-0">
      <Link href={`/videos/${video.id}`} className="block rounded-xl" aria-label={`Open ${video.title}`}>
        <VideoThumb video={video} label={analysis?.status === "complete" ? "Analyzed" : analysis && analysis.status !== "failed" ? "Analyzing…" : undefined} />
      </Link>
      <div className="absolute right-2 top-10 flex flex-col gap-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
        <button
          onClick={() => toggleLibrary(video.id)}
          aria-label={saved ? "Remove from library" : "Save to library"}
          title={saved ? "Remove from library" : "Save to library"}
          className="grid size-8 cursor-pointer place-items-center rounded-lg bg-white/95 text-ink shadow"
        >
          {saved ? <BookmarkCheck className="size-4 text-accent" /> : <Bookmark className="size-4" />}
        </button>
        <button onClick={() => setProj(true)} aria-label="Add to project" title="Add to project" className="grid size-8 cursor-pointer place-items-center rounded-lg bg-white/95 text-ink shadow">
          <FolderPlus className="size-4" />
        </button>
      </div>
      <Link href={`/videos/${video.id}`} className="mt-2 block truncate text-[13px] font-semibold hover:text-accent">{video.title}</Link>
      <p className="mt-0.5 flex justify-between gap-2 text-xs text-muted">
        <span className="truncate">@{ch?.handle}</span>
        <span className="flex-none">{ago(video.postedAt, DEMO_NOW)}</span>
      </p>
      <div className="mt-1.5"><MetricChips score={video.outlier} views={video.views} engagement={video.engagement} /></div>
      <AddToProjectModal open={proj} onClose={() => setProj(false)} item={{ kind: "video", id: video.id }} />
    </article>
  );
}
