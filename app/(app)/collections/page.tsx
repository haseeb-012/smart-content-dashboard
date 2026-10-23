"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BookMarked, Search } from "lucide-react";
import { collections as demoCollections } from "@/lib/mock/data";
import { api, ApiError } from "@/lib/api/client";
import { CATEGORY_KEY, coverStyle, fromApi, fromDemo, type CollectionCardModel } from "@/lib/collections";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select, Skeleton } from "@/components/ui";

const CATS = ["All", "Formats", "Editing Styles", "Visual Hooks", "Signature Series"] as const;
type Cat = (typeof CATS)[number];
type Sort = "Most videos" | "A–Z" | "Recently updated";
const SORT_KEY = { "Most videos": "most_videos", "A–Z": "name", "Recently updated": "recent" } as const;

export default function CollectionsPage() {
  const { live } = useStore();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [cat, setCat] = useState<Cat>("All");
  const [sort, setSort] = useState<Sort>("Most videos");
  const [liveRows, setLiveRows] = useState<CollectionCardModel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Live: the server filters, searches and sorts (published collections only).
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    api
      .collections({ category: cat === "All" ? undefined : CATEGORY_KEY[cat], q: debouncedQ || undefined, sort: SORT_KEY[sort] })
      .then((rows) => { if (!cancelled) { setLiveRows(rows.map(fromApi)); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof ApiError ? e.message : "Couldn't load collections."); });
    return () => { cancelled = true; };
  }, [live, cat, debouncedQ, sort, reload]);

  const demoRows = useMemo(
    () =>
      demoCollections
        .map(fromDemo)
        .filter((c) => (cat === "All" || c.category === cat) && (!debouncedQ || `${c.name} ${c.sub} ${c.description}`.toLowerCase().includes(debouncedQ.toLowerCase())))
        .sort((a, b) => (sort === "A–Z" ? a.name.localeCompare(b.name) : b.count - a.count)),
    [cat, debouncedQ, sort],
  );
  const list = live ? liveRows : demoRows;

  return (
    <>
      <PageHeader title="Collections" subtitle="Curated groups of outlier videos that share one pattern. Free — no credits used." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input aria-label="Search collections" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search collections" />
        </div>
        <Select aria-label="Sort by" className="sm:w-48" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option>Most videos</option><option>A–Z</option>{live && <option>Recently updated</option>}
        </Select>
      </div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {CATS.map((c) => (
          <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)} className={cn("min-h-8 cursor-pointer rounded-full border px-3 text-xs font-semibold", cat === c ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-muted hover:text-ink")}>{c}</button>
        ))}
      </div>

      {error ? (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger">
          <AlertCircle className="size-4" /><span className="flex-1">{error}</span>
          <Button onClick={() => setReload((n) => n + 1)}>Retry</Button>
        </div>
      ) : list === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title={live && cat === "All" && !debouncedQ ? "No collections published yet" : "No collections match"}
          body={live && cat === "All" && !debouncedQ ? "Our team adds new collections every week — check back soon." : "Try a broader search or another category."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((c) => (
            <Link key={c.slug} href={`/collections/${c.slug}`} className="group">
              <Card className="overflow-hidden transition group-hover:border-accent/50 group-hover:shadow-md">
                <div className="grid h-28 place-items-center px-4 text-center" style={coverStyle(c.hue)}>
                  <span className="font-display text-lg font-semibold text-white drop-shadow">{c.name}</span>
                </div>
                <div className="p-4">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-subtle">{c.category} · {c.sub}</p>
                  <p className="mt-1 font-semibold group-hover:text-accent">{c.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{c.description}</p>
                  <Badge className="mt-3">{c.count} videos</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
