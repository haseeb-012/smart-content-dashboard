"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, BookMarked, Download, ExternalLink, Eye, FileText, TrendingUp } from "lucide-react";
import { collections, videos } from "@/lib/mock/data";
import { api, ApiError, type ApiCollectionDetail } from "@/lib/api/client";
import { CATEGORY_LABEL, coverStyle } from "@/lib/collections";
import { useStore } from "@/lib/store";
import { compact, download } from "@/lib/utils";
import { Badge, Button, ButtonLink, Card, EmptyState, PlatformIcon, Skeleton } from "@/components/ui";
import { VideoCard } from "@/components/features/video-card";

function Header({ name, category, sub, description, hue, onExport }: {
  name: string; category: string; sub: string; description: string; hue: string; onExport: (f: "markdown" | "json") => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="h-24" style={coverStyle(hue)} />
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">{category} · {sub}</p>
          <h1 className="mt-1 font-display text-2xl font-medium">{name}</h1>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="good">Free</Badge>
          <Button variant="primary" onClick={() => onExport("markdown")}><Download className="size-4" /> Reference sheet</Button>
          <Button onClick={() => onExport("json")}>JSON</Button>
        </div>
      </div>
    </Card>
  );
}

function Breakdown({ items }: { items: string[] }) {
  return (
    <Card className="h-fit p-5">
      <h2 className="font-semibold">Pattern breakdown</h2>
      <ol className="mt-3 space-y-3 text-sm">
        {items.map((b, i) => (
          <li key={b} className="flex gap-3"><span className="grid size-6 flex-none place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">{i + 1}</span>{b}</li>
        ))}
      </ol>
    </Card>
  );
}

const PLATFORM_NAME = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube" } as const;

function LiveDetail({ slug }: { slug: string }) {
  const { logExport, toast } = useStore();
  const [c, setC] = useState<ApiCollectionDetail | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.collection(slug)
      .then((d) => !cancelled && setC(d))
      .catch((e) => !cancelled && setError(e instanceof ApiError ? { code: e.code, message: e.message } : { code: "error", message: "Couldn't load this collection." }));
    return () => { cancelled = true; };
  }, [slug]);

  if (error?.code === "not_found")
    return <EmptyState icon={BookMarked} title="Collection not found" body="It may have been unpublished or renamed." action={<ButtonLink href="/collections" variant="primary">All collections</ButtonLink>} />;
  if (error)
    return <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger"><AlertCircle className="size-4" />{error.message}</div>;
  if (!c)
    return <div className="space-y-4" aria-busy="true"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;

  const exportAs = (f: "markdown" | "json") => {
    // Public endpoint; the server sends it as a file download.
    window.open(api.collectionExportUrl(c.slug, f), "_blank", "noopener");
    logExport("Collection", c.name, f === "json" ? "JSON" : "Markdown");
    toast("Reference sheet downloading");
  };

  return (
    <>
      <Header name={c.name} category={CATEGORY_LABEL[c.category]} sub={c.sub} description={c.description} hue={c.cover_hue || "from-[#1a5cff] to-[#0a2a8f]"} onExport={exportAs} />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="px-4">
          <p className="border-b border-line py-3 text-xs text-muted tabular">{c.videos.length} curated example{c.videos.length === 1 ? "" : "s"}</p>
          {c.videos.length === 0 && <p className="py-10 text-center text-sm text-muted">Examples are being added to this collection.</p>}
          <ul className="divide-y divide-line">
            {c.videos.map((v) => (
              <li key={v.id} className="py-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 flex-none place-items-center rounded-lg bg-surface-2"><PlatformIcon platform={v.platform} className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{v.title}</p>
                    <p className="text-xs text-muted">{v.creator_handle ? `@${v.creator_handle} · ` : ""}{PLATFORM_NAME[v.platform]}</p>
                    <div className="mt-2 flex flex-wrap gap-1 text-[11px] font-semibold tabular">
                      {v.outlier_score != null && <span className="inline-flex items-center gap-1 rounded-md bg-good-bg px-1.5 py-0.5 text-good"><TrendingUp className="size-3" />{v.outlier_score}x</span>}
                      {v.views != null && <span className="inline-flex items-center gap-1 rounded-md bg-views-bg px-1.5 py-0.5 text-views"><Eye className="size-3" />{compact(v.views)}</span>}
                    </div>
                    {v.notes && <p className="mt-2 text-sm text-ink/80">{v.notes}</p>}
                    {v.transcript && (
                      <div className="mt-2">
                        <button className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-accent" aria-expanded={open === v.id} onClick={() => setOpen(open === v.id ? null : v.id)}>
                          <FileText className="size-3.5" /> {open === v.id ? "Hide transcript" : "Show transcript"}
                        </button>
                        {open === v.id && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-sm leading-6">{v.transcript}</p>}
                      </div>
                    )}
                  </div>
                  <a href={v.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 flex-none items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold hover:border-accent/40 hover:text-accent">
                    Watch <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Breakdown items={c.breakdown} />
      </div>
    </>
  );
}

function DemoDetail({ slug }: { slug: string }) {
  const { allChannels, logExport, toast } = useStore();
  const c = collections.find((x) => x.slug === slug)!;
  const vids = videos.filter((v) => c.videoIds.includes(v.id));

  const exportAs = (f: "markdown" | "json") => {
    const examples = vids.map((v) => ({ title: v.title, creator: allChannels.find((ch) => ch.id === v.channelId)?.handle, views: v.views, outlier: v.outlier }));
    if (f === "json") download(`${c.slug}-reference.json`, JSON.stringify({ name: c.name, category: c.category, breakdown: c.breakdown, examples }, null, 2), "application/json");
    else download(`${c.slug}-reference.md`, [`# ${c.name}`, `${c.category} · ${c.sub}`, "", c.description, "", "## Breakdown", ...c.breakdown.map((b) => `- ${b}`), "", "## Examples", ...examples.map((e) => `- ${e.title} — @${e.creator} · ${compact(e.views)} views · ${e.outlier}x`)].join("\n"), "text/markdown");
    logExport("Collection", c.name, f === "json" ? "JSON" : "Markdown");
    toast("Reference sheet downloaded");
  };

  return (
    <>
      <Header name={c.name} category={c.category} sub={c.sub} description={c.description} hue={c.hue} onExport={exportAs} />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4">
          {vids.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
        <Breakdown items={c.breakdown} />
      </div>
    </>
  );
}

export function CollectionDetail({ slug }: { slug: string }) {
  const { live } = useStore();
  return (
    <>
      <Link href="/collections" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> All collections</Link>
      {live ? <LiveDetail slug={slug} /> : <DemoDetail slug={slug} />}
    </>
  );
}
