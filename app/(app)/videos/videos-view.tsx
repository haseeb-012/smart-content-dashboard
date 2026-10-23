"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Download, Link2, SearchX, SlidersHorizontal, Video as VideoIcon } from "lucide-react";
import { videos, DEMO_NOW } from "@/lib/mock/data";
import { useStore } from "@/lib/store";
import type { Platform, Video } from "@/lib/types";
import { cn, download } from "@/lib/utils";
import { Avatar, Button, ButtonLink, Card, EmptyState, Field, Input, Modal, PageHeader, Segmented, Select } from "@/components/ui";
import { VideoCard } from "@/components/features/video-card";

type Sort = "Outlier score" | "Views" | "Engagement" | "Newest";
interface Filters { channels: string[]; minOutlier: number; minViews: number; maxViews: number; minEng: number; months: number; platform: Platform | "all"; keyword: string }
const blank: Filters = { channels: [], minOutlier: 0, minViews: 0, maxViews: 0, minEng: 0, months: 0, platform: "all", keyword: "" };

const SAVED_KEY = "smartcontent.savedFilters";

export function VideosView() {
  const params = useSearchParams();
  const { ws, allChannels, logExport, toast } = useStore();
  const [tab, setTab] = useState<"Feed" | "Library">("Feed");
  const [sort, setSort] = useState<Sort>("Outlier score");
  const [f, setF] = useState<Filters>({ ...blank, keyword: params.get("q") ?? "" });
  const [showFilters, setShowFilters] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState<Array<{ name: string; f: Filters }>>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load saved filters from browser storage after mount
    try { setSaved(JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]")); } catch {}
  }, []);

  const watch = allChannels.filter((c) => ws.channelIds.includes(c.id));

  const list = useMemo(() => {
    const base = tab === "Library" ? videos.filter((v) => ws.library.includes(v.id)) : videos.filter((v) => ws.channelIds.includes(v.channelId));
    const kw = f.keyword.trim().toLowerCase();
    const out = base.filter((v) =>
      (f.channels.length === 0 || f.channels.includes(v.channelId)) &&
      v.outlier >= f.minOutlier &&
      v.views >= f.minViews && (!f.maxViews || v.views <= f.maxViews) &&
      v.engagement >= f.minEng &&
      (!f.months || DEMO_NOW - Date.parse(v.postedAt) <= f.months * 30 * 86_400_000) &&
      (f.platform === "all" || v.platform === f.platform) &&
      (!kw || `${v.title} ${v.caption} ${allChannels.find((c) => c.id === v.channelId)?.handle}`.toLowerCase().includes(kw)),
    );
    const key: Record<Sort, (v: Video) => number> = { "Outlier score": (v) => v.outlier, Views: (v) => v.views, Engagement: (v) => v.engagement, Newest: (v) => Date.parse(v.postedAt) };
    return out.sort((a, b) => key[sort](b) - key[sort](a));
  }, [tab, ws.library, ws.channelIds, f, sort, allChannels]);

  const active = JSON.stringify(f) !== JSON.stringify(blank);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((p) => ({ ...p, [k]: v }));

  const exportCsv = () => {
    const rows = [["title", "creator", "platform", "posted", "views", "engagement_pct", "outlier"], ...list.map((v) => [v.title, allChannels.find((c) => c.id === v.channelId)?.handle ?? "", v.platform, v.postedAt.slice(0, 10), v.views, v.engagement, v.outlier])];
    download("smart-content-videos.csv", rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv");
    logExport("Videos", `${tab} (${list.length} videos)`, "CSV");
  };

  const filterPanel = (
    <Card className="space-y-4 p-4 text-[13px]">
      {saved.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">Saved filters</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {saved.map((s) => (
              <button key={s.name} onClick={() => setF(s.f)} className="cursor-pointer rounded-full border border-line px-2.5 py-1 text-xs hover:border-accent hover:text-accent">{s.name}</button>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">Filters</p>
        <button onClick={() => setF(blank)} disabled={!active} className="cursor-pointer text-xs text-muted hover:text-ink disabled:opacity-40">Clear</button>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted">Channels</p>
        <div className="flex flex-wrap gap-1.5">
          {watch.map((c) => {
            const on = f.channels.includes(c.id);
            return (
              <button
                key={c.id}
                aria-pressed={on}
                title={`@${c.handle}`}
                onClick={() => set("channels", on ? f.channels.filter((x) => x !== c.id) : [...f.channels, c.id])}
                className={cn("cursor-pointer rounded-full ring-2 ring-offset-1", on ? "ring-accent" : "ring-transparent opacity-80 hover:opacity-100")}
              >
                <Avatar name={c.name} color={c.color} size={26} />
              </button>
            );
          })}
          {watch.length === 0 && <span className="text-xs text-subtle">No channels tracked yet.</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Min outlier">
          <Select value={f.minOutlier} onChange={(e) => set("minOutlier", Number(e.target.value))}>
            {[0, 2, 5, 10, 25, 50].map((n) => <option key={n} value={n}>{n ? `≥ ${n}x` : "Any"}</option>)}
          </Select>
        </Field>
        <Field label="Min engagement">
          <Select value={f.minEng} onChange={(e) => set("minEng", Number(e.target.value))}>
            {[0, 2, 4, 6, 8].map((n) => <option key={n} value={n}>{n ? `≥ ${n}%` : "Any"}</option>)}
          </Select>
        </Field>
        <Field label="Min views">
          <Select value={f.minViews} onChange={(e) => set("minViews", Number(e.target.value))}>
            {[0, 10_000, 100_000, 1_000_000, 10_000_000].map((n) => <option key={n} value={n}>{n ? `≥ ${Intl.NumberFormat("en", { notation: "compact" }).format(n)}` : "Any"}</option>)}
          </Select>
        </Field>
        <Field label="Max views">
          <Select value={f.maxViews} onChange={(e) => set("maxViews", Number(e.target.value))}>
            {[0, 100_000, 1_000_000, 10_000_000].map((n) => <option key={n} value={n}>{n ? `≤ ${Intl.NumberFormat("en", { notation: "compact" }).format(n)}` : "Any"}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Posted within">
        <Select value={f.months} onChange={(e) => set("months", Number(e.target.value))}>
          {[0, 1, 3, 6, 9, 12].map((n) => <option key={n} value={n}>{n ? `${n} month${n > 1 ? "s" : ""}` : "Any time"}</option>)}
        </Select>
      </Field>
      <Field label="Platform">
        <Select value={f.platform} onChange={(e) => set("platform", e.target.value as Filters["platform"])}>
          <option value="all">All platforms</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
        </Select>
      </Field>
      <Field label="Keywords">
        <Input value={f.keyword} onChange={(e) => set("keyword", e.target.value)} placeholder="Search captions and titles" />
      </Field>
      <Button
        variant="primary"
        className="w-full"
        disabled={!active}
        onClick={() => {
          const name = window.prompt("Name this filter");
          if (!name) return;
          const next = [...saved.filter((s) => s.name !== name), { name, f }];
          setSaved(next);
          try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch {}
          toast(`Saved filter “${name}”`);
        }}
      >
        Save filter
      </Button>
    </Card>
  );

  return (
    <>
      <PageHeader title="Videos" subtitle={tab === "Feed" ? "Outliers from the channels you track, scored against each channel's own average" : "Videos you saved or analyzed"} />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2">
        <Segmented label="Video source" value={tab} options={["Feed", "Library"] as const} onChange={setTab} />
        <Button variant="ghost" className="xl:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
          <SlidersHorizontal className="size-4" /> Filters{active ? " •" : ""}
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button variant="ghost" onClick={() => setUrlOpen(true)}><Link2 className="size-4" /> Add video URL</Button>
          <label className="flex items-center gap-1.5 text-[13px] font-semibold">
            <ArrowUpDown className="size-4" aria-hidden />
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="min-h-9 cursor-pointer rounded-lg bg-transparent pr-1 hover:bg-black/5">
              {(["Outlier score", "Views", "Engagement", "Newest"] as Sort[]).map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <Button variant="ghost" onClick={exportCsv} disabled={list.length === 0}><Download className="size-4" /> Export</Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <div className={cn(showFilters ? "block" : "hidden", "xl:block")}>{filterPanel}</div>
        <div>
          <p className="mb-3 text-xs text-muted tabular">{list.length} video{list.length === 1 ? "" : "s"}</p>
          {ws.channelIds.length === 0 && tab === "Feed" ? (
            <EmptyState icon={VideoIcon} title="Your feed is empty" body="Add a few channels to track and their outlier videos will show up here." action={<ButtonLink href="/channels" variant="primary">Add channels</ButtonLink>} />
          ) : list.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={tab === "Library" && !active ? "Nothing saved yet" : "No videos match"}
              body={tab === "Library" && !active ? "Save or analyze videos from your feed and they'll appear here." : "Try a lower outlier score, a wider date range or fewer channels."}
              action={active ? <Button onClick={() => setF(blank)}>Clear filters</Button> : undefined}
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {list.map((v) => <VideoCard key={v.id} video={v} />)}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={urlOpen}
        onClose={() => setUrlOpen(false)}
        title="Add video by URL"
        footer={
          <>
            <Button onClick={() => setUrlOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!/^https?:\/\/(www\.)?(tiktok\.com|instagram\.com|youtube\.com|youtu\.be)\//i.test(url)}
              onClick={() => { toast("Video queued for import. It will appear in your Library once fetched."); setUrl(""); setUrlOpen(false); }}
            >
              Add video
            </Button>
          </>
        }
      >
        <Field label="Video URL" hint="TikTok, Instagram Reels or YouTube Shorts link. Fetching runs on the backend (coming in Phase 5).">
          <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@creator/video/…" />
        </Field>
      </Modal>
    </>
  );
}
