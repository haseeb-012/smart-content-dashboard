"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { collections } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { Badge, Card, Input, PageHeader, Select } from "@/components/ui";

const CATS = ["All", "Formats", "Editing Styles", "Visual Hooks", "Signature Series"] as const;

export default function CollectionsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [sort, setSort] = useState("Most videos");
  const list = useMemo(
    () =>
      collections
        .filter((c) => (cat === "All" || c.category === cat) && (!q || `${c.name} ${c.sub} ${c.description}`.toLowerCase().includes(q.toLowerCase())))
        .sort((a, b) => (sort === "A–Z" ? a.name.localeCompare(b.name) : b.videoIds.length - a.videoIds.length)),
    [q, cat, sort],
  );

  return (
    <>
      <PageHeader title="Collections" subtitle="Curated groups of outlier videos that share one pattern. Free — no credits used." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input aria-label="Search collections" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search collections" />
        </div>
        <Select aria-label="Sort by" className="sm:w-40" value={sort} onChange={(e) => setSort(e.target.value)}><option>Most videos</option><option>A–Z</option></Select>
      </div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {CATS.map((c) => (
          <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)} className={cn("min-h-8 cursor-pointer rounded-full border px-3 text-xs font-semibold", cat === c ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-muted hover:text-ink")}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {list.map((c) => (
          <Link key={c.slug} href={`/collections/${c.slug}`} className="group">
            <Card className="overflow-hidden transition group-hover:border-accent/50 group-hover:shadow-md">
              <div className={cn("grid h-28 place-items-center bg-gradient-to-br px-4 text-center", c.hue)}>
                <span className="font-display text-lg font-semibold text-white drop-shadow">{c.name}</span>
              </div>
              <div className="p-4">
                <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-subtle">{c.category} · {c.sub}</p>
                <p className="mt-1 font-semibold group-hover:text-accent">{c.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{c.description}</p>
                <Badge className="mt-3">{c.videoIds.length} videos</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {list.length === 0 && <p className="py-12 text-center text-sm text-muted">No collections match — try a broader search.</p>}
    </>
  );
}
