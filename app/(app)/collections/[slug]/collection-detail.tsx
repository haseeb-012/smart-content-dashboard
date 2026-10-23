"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { collections, videos } from "@/lib/mock/data";
import { useStore } from "@/lib/store";
import { cn, compact, download } from "@/lib/utils";
import { Badge, Button, Card } from "@/components/ui";
import { VideoCard } from "@/components/features/video-card";

export function CollectionDetail({ slug }: { slug: string }) {
  const { allChannels, logExport, toast } = useStore();
  const c = collections.find((x) => x.slug === slug)!;
  const vids = videos.filter((v) => c.videoIds.includes(v.id));

  const exportSheet = () => {
    const md = [
      `# ${c.name}`, `${c.category} · ${c.sub}`, "", c.description, "", "## Breakdown", ...c.breakdown.map((b) => `- ${b}`), "", "## Examples",
      ...vids.map((v) => `- ${v.title} — @${allChannels.find((ch) => ch.id === v.channelId)?.handle} · ${compact(v.views)} views · ${v.outlier}x`),
    ].join("\n");
    download(`${c.slug}-reference-sheet.md`, md, "text/markdown");
    logExport("Collection", c.name, "Markdown");
    toast("Reference sheet downloaded");
  };

  return (
    <>
      <Link href="/collections" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> All collections</Link>
      <Card className="overflow-hidden">
        <div className={cn("h-24 bg-gradient-to-br", c.hue)} />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">{c.category} · {c.sub}</p>
            <h1 className="mt-1 font-display text-2xl font-medium">{c.name}</h1>
            <p className="mt-1 text-sm text-muted">{c.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="good">Free</Badge>
            <Button variant="primary" onClick={exportSheet}><Download className="size-4" /> Export reference sheet</Button>
          </div>
        </div>
      </Card>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4">
          {vids.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
        <Card className="h-fit p-5">
          <h2 className="font-semibold">Pattern breakdown</h2>
          <ol className="mt-3 space-y-3 text-sm">
            {c.breakdown.map((b, i) => (
              <li key={b} className="flex gap-3"><span className="grid size-6 flex-none place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">{i + 1}</span>{b}</li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted">Open any example for its transcript and full breakdown.</p>
        </Card>
      </div>
    </>
  );
}
