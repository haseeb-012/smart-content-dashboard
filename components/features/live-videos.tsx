"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowUpDown, Download, ExternalLink, Eye, Flame, SearchX, SlidersHorizontal, TrendingUp, Video as VideoIcon } from "lucide-react";
import { api, ApiError, type ApiFeedVideo, type ApiPlatform, type ApiWatchlistItem, type FeedParams } from "@/lib/api/client";
import { useStore } from "@/lib/store";
import { ago, cn, compact, download } from "@/lib/utils";
import { Avatar, Button, ButtonLink, Card, EmptyState, Field, Input, PageHeader, PlatformIcon, Select, Skeleton } from "@/components/ui";

type Sort = NonNullable<FeedParams["sort"]>;
const SORTS: Array<[Sort, string]> = [["outlier", "Outlier score"], ["views", "Views"], ["engagement", "Engagement"], ["newest", "Newest"]];
const PAGE = 48;
const color = (s: string) => `hsl(${[...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)} 65% 52%)`;

function LiveVideoCard({ v }: { v: ApiFeedVideo }) {
  return (
    <article className="group min-w-0">
      <a href={v.url} target="_blank" rel="noopener noreferrer" className="block" aria-label={`Open on ${v.platform}: ${v.caption.slice(0, 60)}`}>
        <div
          className="relative aspect-[9/14] overflow-hidden rounded-xl bg-cover bg-center"
          style={v.thumbnail_url ? { backgroundImage: `url("${v.thumbnail_url}")` } : { backgroundImage: `linear-gradient(135deg, ${color(v.channel.handle)}, #0a1430)` }}
        >
          <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-md bg-white/95 text-ink shadow-sm"><PlatformIcon platform={v.platform} /></span>
          {v.duration_sec != null && (
            <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular">
              {Math.floor(v.duration_sec / 60)}:{String(v.duration_sec % 60).padStart(2, "0")}
            </span>
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
            <span className="flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink">Watch <ExternalLink className="size-3" /></span>
          </span>
        </div>
      </a>
      <p className="mt-2 line-clamp-1 text-[13px] font-semibold" title={v.caption}>{v.caption || "Untitled video"}</p>
      <p className="mt-0.5 flex justify-between gap-2 text-xs text-muted">
        <span className="truncate">@{v.channel.handle}</span>
        <span className="flex-none">{v.posted_at ? ago(v.posted_at) : ""}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] font-semibold tabular">
        <span title="Outlier score (vs. this channel's median)" className="inline-flex items-center gap-1 rounded-md bg-good-bg px-1.5 py-0.5 text-good">
          <TrendingUp className="size-3" aria-hidden />{v.outlier_score != null ? `${v.outlier_score >= 10 ? Math.round(v.outlier_score) : v.outlier_score.toFixed(1)}x` : "new"}
        </span>
        <span title="Views" className="inline-flex items-center gap-1 rounded-md bg-views-bg px-1.5 py-0.5 text-views"><Eye className="size-3" aria-hidden />{compact(v.views)}</span>
        <span title="Engagement" className="inline-flex items-center gap-1 rounded-md bg-warn-bg px-1.5 py-0.5 text-warn"><Flame className="size-3" aria-hidden />{v.engagement_rate}%</span>
      </div>
    </article>
  );
}

interface Filters { channels: string[]; minOutlier: number; minViews: number; maxViews: number; minEng: number; months: number; platform: ApiPlatform | ""; q: string }

export function LiveVideos() {
  const { state } = useStore();
  const ws = state.activeId;
  const params = useSearchParams();
  const blank: Filters = { channels: [], minOutlier: 0, minViews: 0, maxViews: 0, minEng: 0, months: 0, platform: "", q: "" };
  const [f, setF] = useState<Filters>({ ...blank, q: params.get("q") ?? "" });
  const [debouncedQ, setDebouncedQ] = useState(f.q);
  const [sort, setSort] = useState<Sort>("outlier");
  const [items, setItems] = useState<ApiFeedVideo[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [watch, setWatch] = useState<ApiWatchlistItem[] | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(f.q), 300); return () => clearTimeout(t); }, [f.q]);
  useEffect(() => { if (ws) api.watchlist(ws).then(setWatch).catch(() => setWatch([])); }, [ws]);

  const query = useCallback(
    (offset: number): FeedParams => ({
      channel_id: f.channels.length ? f.channels : undefined,
      platform: f.platform || undefined,
      min_outlier: f.minOutlier,
      min_views: f.minViews,
      max_views: f.maxViews,
      min_engagement: f.minEng,
      posted_within_days: f.months ? f.months * 30 : undefined,
      q: debouncedQ.trim() || undefined,
      sort,
      limit: PAGE,
      offset,
    }),
    [f.channels, f.platform, f.minOutlier, f.minViews, f.maxViews, f.minEng, f.months, debouncedQ, sort],
  );

  useEffect(() => {
    if (!ws) return;
    let cancelled = false;
    api.feed(ws, query(0))
      .then((r) => { if (!cancelled) { setItems(r.items); setTotal(r.total); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof ApiError ? e.message : "Couldn't load videos."); });
    return () => { cancelled = true; };
  }, [ws, query]);

  const loadMore = async () => {
    if (!items) return;
    setMore(true);
    try {
      const r = await api.feed(ws, query(items.length));
      setItems([...items, ...r.items]);
      setTotal(r.total);
    } finally {
      setMore(false);
    }
  };

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((p) => ({ ...p, [k]: v }));
  const active = JSON.stringify({ ...f, q: "" }) !== JSON.stringify({ ...blank, q: "" }) || Boolean(f.q);

  const exportCsv = () => {
    if (!items) return;
    const rows = [["caption", "creator", "platform", "posted", "views", "engagement_pct", "outlier", "url"], ...items.map((v) => [v.caption, v.channel.handle, v.platform, v.posted_at?.slice(0, 10) ?? "", v.views, v.engagement_rate, v.outlier_score ?? "", v.url])];
    download("smart-content-videos.csv", rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv");
  };

  const n = (label: string, key: "minOutlier" | "minEng" | "minViews" | "maxViews", opts: number[], fmt: (x: number) => string) => (
    <Field label={label}>
      <Select value={f[key]} onChange={(e) => set(key, Number(e.target.value))}>
        {opts.map((x) => <option key={x} value={x}>{x ? fmt(x) : "Any"}</option>)}
      </Select>
    </Field>
  );
  const k = (x: number) => Intl.NumberFormat("en", { notation: "compact" }).format(x);

  const filterPanel = (
    <Card className="space-y-4 p-4 text-[13px]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">Filters</p>
        <button onClick={() => setF(blank)} disabled={!active} className="cursor-pointer text-xs text-muted hover:text-ink disabled:opacity-40">Clear</button>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted">Channels</p>
        <div className="flex flex-wrap gap-1.5">
          {(watch ?? []).map((c) => {
            const on = f.channels.includes(c.id);
            return (
              <button key={c.id} aria-pressed={on} title={`@${c.handle}`} onClick={() => set("channels", on ? f.channels.filter((x) => x !== c.id) : [...f.channels, c.id])}
                className={cn("cursor-pointer rounded-full ring-2 ring-offset-1", on ? "ring-accent" : "ring-transparent opacity-80 hover:opacity-100")}>
                <Avatar name={c.display_name || c.handle} color={color(c.handle)} size={26} />
              </button>
            );
          })}
          {watch?.length === 0 && <span className="text-xs text-subtle">No channels tracked yet.</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {n("Min outlier", "minOutlier", [0, 2, 5, 10, 25, 50], (x) => `≥ ${x}x`)}
        {n("Min engagement", "minEng", [0, 2, 4, 6, 8], (x) => `≥ ${x}%`)}
        {n("Min views", "minViews", [0, 10_000, 100_000, 1_000_000, 10_000_000], (x) => `≥ ${k(x)}`)}
        {n("Max views", "maxViews", [0, 100_000, 1_000_000, 10_000_000], (x) => `≤ ${k(x)}`)}
      </div>
      <Field label="Posted within">
        <Select value={f.months} onChange={(e) => set("months", Number(e.target.value))}>
          {[0, 1, 3, 6, 9, 12].map((m) => <option key={m} value={m}>{m ? `${m} month${m > 1 ? "s" : ""}` : "Any time"}</option>)}
        </Select>
      </Field>
      <Field label="Platform">
        <Select value={f.platform} onChange={(e) => set("platform", e.target.value as ApiPlatform | "")}>
          <option value="">All platforms</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="youtube">YouTube</option>
        </Select>
      </Field>
      <Field label="Keywords"><Input value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Search captions and creators" /></Field>
    </Card>
  );

  return (
    <>
      <PageHeader title="Videos" subtitle="Outliers from the channels you track, scored against each channel's own median" />
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2">
        <span className="rounded-lg bg-black/[0.05] px-4 py-1.5 text-[13px] font-medium">Feed</span>
        <Button variant="ghost" className="xl:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}><SlidersHorizontal className="size-4" /> Filters{active ? " •" : ""}</Button>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <label className="flex items-center gap-1.5 text-[13px] font-semibold">
            <ArrowUpDown className="size-4" aria-hidden /><span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="min-h-9 cursor-pointer rounded-lg bg-transparent pr-1 hover:bg-black/5">
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <Button variant="ghost" onClick={exportCsv} disabled={!items?.length}><Download className="size-4" /> Export</Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <div className={cn(showFilters ? "block" : "hidden", "xl:block")}>{filterPanel}</div>
        <div>
          {error ? (
            <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger"><AlertCircle className="size-4" />{error}</div>
          ) : items === null ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[9/14] rounded-xl" />)}</div>
          ) : watch?.length === 0 ? (
            <EmptyState icon={VideoIcon} title="Your feed is empty" body="Track a few channels and their outlier videos will show up here." action={<ButtonLink href="/channels" variant="primary">Add channels</ButtonLink>} />
          ) : items.length === 0 ? (
            <EmptyState icon={SearchX} title="No videos match" body={watch?.some((c) => c.sync_status === "pending") ? "We're still fetching videos for your channels — check back in a moment." : "Try a lower outlier score, a wider date range or fewer channels."} action={active ? <Button onClick={() => setF(blank)}>Clear filters</Button> : undefined} />
          ) : (
            <>
              <p className="mb-3 text-xs text-muted tabular">{total} video{total === 1 ? "" : "s"}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {items.map((v) => <LiveVideoCard key={v.id} v={v} />)}
              </div>
              {items.length < total && (
                <div className="mt-6 flex justify-center"><Button onClick={loadMore} loading={more}>Load more</Button></div>
              )}
              <p className="mt-6 text-center text-xs text-subtle">Deep analysis (transcript, hook, format) arrives in the next step.</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
