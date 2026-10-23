"use client";

import { useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, Copy, Search, Sparkles, Wand2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { hooks } from "@/lib/mock/data";
import { generateHooks } from "@/lib/generate";
import type { HookCategory } from "@/lib/types";
import { cn, compact } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Tabs } from "@/components/ui";

const CATS: Array<HookCategory | "All"> = ["All", "Contrarian", "Curiosity gap", "Question", "Unexpected claim", "Problem"];
const VIEWS = ["Library", "Generator", "Watchlist"] as const;

function HookRow({ text, meta }: { text: string; meta?: React.ReactNode }) {
  const { ws, toggleHook, toast } = useStore();
  const saved = ws.savedHooks.includes(text);
  return (
    <li className="flex items-center gap-3 py-3">
      <p className="flex-1 text-sm">{text}</p>
      {meta}
      <button className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-black/5 hover:text-ink" aria-label="Copy hook" onClick={() => { navigator.clipboard.writeText(text); toast("Hook copied"); }}>
        <Copy className="size-4" />
      </button>
      <button className="grid size-9 cursor-pointer place-items-center rounded-lg hover:bg-black/5" aria-pressed={saved} aria-label={saved ? "Remove from watchlist" : "Save to watchlist"} onClick={() => toggleHook(text)}>
        {saved ? <BookmarkCheck className="size-4 text-accent" /> : <Bookmark className="size-4 text-muted" />}
      </button>
    </li>
  );
}

export default function HooksPage() {
  const { ws } = useStore();
  const [view, setView] = useState<(typeof VIEWS)[number]>("Library");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<HookCategory | "All">("All");
  const [niche, setNiche] = useState("All");
  const [topic, setTopic] = useState("");
  const [gCat, setGCat] = useState<HookCategory | "All">("All");
  const [count, setCount] = useState(20);
  const [generated, setGenerated] = useState<string[]>([]);

  const niches = ["All", ...new Set(hooks.map((h) => h.niche))];
  const lib = useMemo(
    () => hooks.filter((h) => (cat === "All" || h.category === cat) && (niche === "All" || h.niche === niche) && (!q || h.text.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.views - a.views),
    [q, cat, niche],
  );

  return (
    <>
      <PageHeader title="Hooks" subtitle="Proven opening lines, a generator, and your saved hooks" />
      <Tabs value={view} options={VIEWS} onChange={setView} />
      <div className="mt-5">
        {view === "Library" && (
          <>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                <Input aria-label="Search hooks" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hooks" />
              </div>
              <Select aria-label="Niche" className="sm:w-44" value={niche} onChange={(e) => setNiche(e.target.value)}>{niches.map((n) => <option key={n}>{n}</option>)}</Select>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {CATS.map((c) => (
                <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)} className={cn("min-h-8 cursor-pointer rounded-full border px-3 text-xs font-semibold", cat === c ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-muted hover:text-ink")}>{c}</button>
              ))}
            </div>
            <Card className="px-4">
              <ul className="divide-y divide-line">
                {lib.map((h) => <HookRow key={h.id} text={h.text} meta={<><Badge className="hidden sm:inline-flex">{h.category}</Badge><span className="hidden w-16 text-right text-xs text-muted tabular md:block">{compact(h.views)} views</span></>} />)}
              </ul>
              {lib.length === 0 && <p className="py-10 text-center text-sm text-muted">No hooks match. Try another category or niche.</p>}
            </Card>
          </>
        )}

        {view === "Generator" && (
          <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <Card className="h-fit space-y-4 p-4">
              <Field label="Topic or niche"><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. meal prep for students" /></Field>
              <Field label="Hook type">
                <Select value={gCat} onChange={(e) => setGCat(e.target.value as HookCategory | "All")}>{CATS.map((c) => <option key={c}>{c}</option>)}</Select>
              </Field>
              <Field label="How many">
                <Select value={count} onChange={(e) => setCount(Number(e.target.value))}>{[10, 20, 30, 50].map((n) => <option key={n}>{n}</option>)}</Select>
              </Field>
              <Button variant="accent" className="w-full" disabled={!topic.trim()} onClick={() => setGenerated(generateHooks(topic, gCat, count))}>
                <Wand2 className="size-4" /> Generate hooks
              </Button>
              <p className="text-xs text-muted">Generating hooks is free.</p>
            </Card>
            {generated.length === 0 ? (
              <EmptyState icon={Sparkles} title="Generate dozens of hooks in seconds" body="Enter a topic, pick a hook type, and we'll fill proven templates for you." />
            ) : (
              <Card className="px-4">
                <p className="border-b border-line py-3 text-xs text-muted">{generated.length} variations for “{topic}”</p>
                <ul className="divide-y divide-line">{generated.map((g) => <HookRow key={g} text={g} />)}</ul>
              </Card>
            )}
          </div>
        )}

        {view === "Watchlist" &&
          (ws.savedHooks.length === 0 ? (
            <EmptyState icon={Bookmark} title="No saved hooks" body="Save hooks from the library or generator. They'll be available inside the script editor." />
          ) : (
            <Card className="px-4"><ul className="divide-y divide-line">{ws.savedHooks.map((h) => <HookRow key={h} text={h} />)}</ul></Card>
          ))}
      </div>
    </>
  );
}
