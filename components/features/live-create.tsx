"use client";

// Live (API-backed) versions of the Create screens: Ideas, Hooks, Scripts, Script editor, Projects, Exports.
// Demo mode keeps the local-store versions in the page files.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type DependencyList } from "react";
import {
  AlertCircle, ArrowLeft, Bookmark, BookmarkCheck, Check, Copy, Download, FileJson, FileText, FolderOpen, FolderPlus, History,
  Lightbulb, Maximize2, Plus, Save, Search, Sparkles, Star, Trash2, Video as VideoIcon, Wand2, X,
} from "lucide-react";
import {
  api, ApiError, type ApiBlocks, type ApiHookCategory, type ApiIdea, type ApiItemKind, type ApiProject, type ApiSavedHook, type ApiScript,
} from "@/lib/api/client";
import { useStore } from "@/lib/store";
import { ago, cn, compact, download } from "@/lib/utils";
import { Badge, Button, ButtonLink, Card, CreditCost, EmptyState, Field, Input, Modal, PageHeader, Segmented, Select, Skeleton, Tabs, Textarea } from "@/components/ui";

export const HOOK_CATS: Array<[ApiHookCategory | "", string]> = [
  ["", "All"], ["contrarian", "Contrarian"], ["curiosity_gap", "Curiosity gap"], ["question", "Question"], ["unexpected_claim", "Unexpected claim"], ["problem", "Problem"],
];
export const catLabel = (c: string | null) => HOOK_CATS.find(([k]) => k === c)?.[1] ?? "Other";
const msg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);
const newKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9_.:-]/g, "");

/** Load data for the active workspace; returns [data, setData, error, reload]. */
function useWsData<T>(fn: (ws: string) => Promise<T>, deps: DependencyList = []) {
  const { state } = useStore();
  const ws = state.activeId;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    if (ws) fn(ws).then((d) => { if (alive) { setData(d); setError(null); } }).catch((e) => alive && setError(msg(e, "Couldn't load this page.")));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fn is recreated each render; deps are explicit
  }, [ws, tick, ...deps]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ws, data, setData, error, reload };
}

function Loading() {
  return <div className="space-y-3" aria-busy="true"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
}
function LoadError({ error, reload }: { error: string; reload: () => void }) {
  return <EmptyState icon={AlertCircle} title="Couldn't load this page" body={error} action={<Button onClick={reload}>Try again</Button>} />;
}

/** Shared "save to hook watchlist" toggle used by Hooks + analysis. */
export function useSavedHooks() {
  const { ws, data, setData } = useWsData((w) => api.savedHooks(w));
  const { toast } = useStore();
  const saved = data ?? [];
  const find = (text: string) => saved.find((h) => h.text === text.replace(/\s+/g, " ").trim());
  const toggle = async (text: string, category: ApiHookCategory | null, source: "library" | "generator" | "analysis" | "manual") => {
    if (!ws) return;
    const existing = find(text);
    try {
      if (existing) {
        await api.unsaveHook(ws, existing.id);
        setData(saved.filter((h) => h.id !== existing.id));
        toast("Removed from your hooks");
      } else {
        const h = await api.saveHook(ws, text, category, source);
        setData([h, ...saved.filter((x) => x.id !== h.id)]);
        toast("Saved to your hooks");
      }
    } catch (e) {
      toast(msg(e, "Couldn't update your hooks."), "error");
    }
  };
  return { saved, isSaved: (t: string) => Boolean(find(t)), toggle, loaded: data !== null };
}

// ================================================================== Ideas

export function LiveIdeas() {
  const router = useRouter();
  const { state, toast, refresh } = useStore();
  const [view, setView] = useState<"All" | "Shortlisted">("All");
  const { ws, data, setData, error, reload } = useWsData((w) => api.ideas(w));
  const [gen, setGen] = useState(false);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [proj, setProj] = useState<string | null>(null);

  if (error) return <LoadError error={error} reload={reload} />;
  const list = (data ?? []).filter((i) => view === "All" || i.shortlisted);

  const patch = (idea: ApiIdea) => setData((cur) => (cur ?? []).map((i) => (i.id === idea.id ? idea : i)));
  const shortlist = async (i: ApiIdea) => {
    try { patch(await api.updateIdea(ws, i.id, { shortlisted: !i.shortlisted })); } catch (e) { toast(msg(e, "Couldn't update the idea."), "error"); }
  };
  const remove = async (i: ApiIdea) => {
    try { await api.deleteIdea(ws, i.id); setData((cur) => (cur ?? []).filter((x) => x.id !== i.id)); toast("Idea deleted"); } catch (e) { toast(msg(e, "Couldn't delete the idea."), "error"); }
  };
  const write = async (i: ApiIdea) => {
    setBusy(i.id);
    try {
      const s = await api.createScript(ws, { title: i.title, topic: i.title, source_idea_id: i.id, source_video_id: i.video_id ?? undefined }, newKey());
      void refresh();
      router.push(`/scripts/${s.id}`);
    } catch (e) {
      toast(msg(e, "Couldn't write the script."), "error");
    } finally {
      setBusy(null);
    }
  };
  const generate = async () => {
    setBusy("gen");
    try {
      const ideas = await api.generateIdeas(ws, topic.trim(), 5);
      setData((cur) => [...ideas, ...(cur ?? [])]);
      toast(`${ideas.length} new ideas — no credit used`);
      setGen(false); setTopic("");
    } catch (e) {
      toast(msg(e, "Couldn't generate ideas."), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Ideas"
        subtitle="Created from every video you analyze, or generated for your niche — no extra credit"
        actions={<>
          <Segmented label="Ideas view" value={view} options={["All", "Shortlisted"] as const} onChange={setView} />
          <Button variant="primary" onClick={() => setGen(true)}><Wand2 className="size-4" /> Generate ideas</Button>
        </>}
      />
      {data === null ? <Loading /> : list.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title={view === "Shortlisted" ? "No shortlisted ideas" : "No ideas yet"}
          body={view === "Shortlisted" ? "Star ideas you want to come back to." : "Analyze an outlier video, or generate ideas for your niche."}
          action={<div className="flex flex-wrap justify-center gap-2"><ButtonLink href="/videos" variant="primary">Find a video</ButtonLink><Button onClick={() => setGen(true)}>Generate ideas</Button></div>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((idea) => (
            <Card key={idea.id} className="p-4">
              <div className="flex items-start gap-2">
                <h2 className="flex-1 font-display text-[17px] font-medium leading-6">{idea.title}</h2>
                <button onClick={() => shortlist(idea)} aria-pressed={idea.shortlisted} aria-label={idea.shortlisted ? "Remove from shortlist" : "Add to shortlist"} className="grid size-9 cursor-pointer place-items-center rounded-lg hover:bg-black/5">
                  <Star className={cn("size-4", idea.shortlisted ? "fill-amber-400 text-amber-500" : "text-subtle")} />
                </button>
              </div>
              <p className="text-xs text-muted">
                {idea.source === "analysis" ? "From an analyzed video" : idea.source === "generated" ? "Generated" : "Added by you"} · {ago(idea.created_at)}
                {idea.video_id && <> · <Link className="font-semibold text-accent" href={`/videos/${idea.video_id}`}>View source video</Link></>}
              </p>
              <dl className="mt-3 grid gap-2 text-[13px]">
                {[["Positioning", idea.positioning], ["Storytelling format", idea.format], ["Contrast", idea.contrast], ["Make it yours", idea.personalization]].map(([k, val]) => (
                  <div key={k}><dt className="text-[11px] font-semibold uppercase tracking-wide text-subtle">{k}</dt><dd>{val}</dd></div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" loading={busy === idea.id} disabled={state.credits < 1 || busy !== null} onClick={() => write(idea)}>
                  <FileText className="size-4" /> Write script <CreditCost />
                </Button>
                <Button onClick={() => setProj(idea.id)}><FolderPlus className="size-4" /> Add to project</Button>
                <Button variant="ghost" onClick={() => remove(idea)} aria-label="Delete idea"><Trash2 className="size-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={gen} onClose={() => setGen(false)} title="Generate ideas"
        footer={<><Button onClick={() => setGen(false)}>Cancel</Button><Button variant="primary" loading={busy === "gen"} disabled={topic.trim().length < 2} onClick={generate}><Wand2 className="size-4" /> Generate 5 ideas</Button></>}>
        <div className="space-y-3">
          <Field label="Your niche or topic"><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. budget travel for students" /></Field>
          <p className="text-xs text-muted">Free. Uses the videos you&apos;ve analyzed as context, so ideas fit what already works for you.</p>
        </div>
      </Modal>
      {proj && <LiveAddToProject open onClose={() => setProj(null)} kind="idea" refId={proj} />}
    </>
  );
}

// ================================================================== Hooks

const VIEWS = ["Library", "Generator", "Watchlist"] as const;

function HookRow({ text, category, source, hooks, meta }: { text: string; category: ApiHookCategory | null; source: "library" | "generator"; hooks: ReturnType<typeof useSavedHooks>; meta?: React.ReactNode }) {
  const { toast } = useStore();
  const saved = hooks.isSaved(text);
  return (
    <li className="flex items-center gap-3 py-3">
      <p className="flex-1 text-sm">{text}</p>
      {meta}
      <button className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-black/5 hover:text-ink" aria-label="Copy hook" onClick={() => { void navigator.clipboard.writeText(text); toast("Hook copied"); }}>
        <Copy className="size-4" />
      </button>
      <button className="grid size-9 cursor-pointer place-items-center rounded-lg hover:bg-black/5" aria-pressed={saved} aria-label={saved ? "Remove from watchlist" : "Save to watchlist"} onClick={() => hooks.toggle(text, category, source)}>
        {saved ? <BookmarkCheck className="size-4 text-accent" /> : <Bookmark className="size-4 text-muted" />}
      </button>
    </li>
  );
}

export function LiveHooks() {
  const { state, toast } = useStore();
  const hooks = useSavedHooks();
  const [view, setView] = useState<(typeof VIEWS)[number]>("Library");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [cat, setCat] = useState<ApiHookCategory | "">("");
  const [niche, setNiche] = useState("");
  const { data: lib, error, reload } = useWsData(() => api.hookLibrary({ category: cat || undefined, niche: niche || undefined, q: dq || undefined }), [cat, niche, dq]);
  const [allNiches, setAllNiches] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [gCat, setGCat] = useState<ApiHookCategory | "">("");
  const [count, setCount] = useState(20);
  const [generated, setGenerated] = useState<Array<{ text: string; category: ApiHookCategory }>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { let alive = true; api.hookLibrary().then((h) => alive && setAllNiches([...new Set(h.map((x) => x.niche))].sort())).catch(() => {}); return () => { alive = false; }; }, []);

  const generate = async () => {
    setBusy(true);
    try {
      setGenerated(await api.generateHooks(state.activeId, topic.trim(), gCat || undefined, count));
    } catch (e) {
      toast(msg(e, "Couldn't generate hooks."), "error");
    } finally {
      setBusy(false);
    }
  };

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
              <Select aria-label="Niche" className="sm:w-44" value={niche} onChange={(e) => setNiche(e.target.value)}>
                <option value="">All niches</option>
                {allNiches.map((n) => <option key={n}>{n}</option>)}
              </Select>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {HOOK_CATS.map(([c, label]) => (
                <button key={label} aria-pressed={cat === c} onClick={() => setCat(c)} className={cn("min-h-8 cursor-pointer rounded-full border px-3 text-xs font-semibold", cat === c ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-muted hover:text-ink")}>{label}</button>
              ))}
            </div>
            {error ? <LoadError error={error} reload={reload} /> : lib === null ? <Loading /> : (
              <Card className="px-4">
                <ul className="divide-y divide-line">
                  {lib.map((h) => <HookRow key={h.id} text={h.text} category={h.category} source="library" hooks={hooks} meta={<><Badge className="hidden sm:inline-flex">{catLabel(h.category)}</Badge>{h.views != null && <span className="hidden w-16 text-right text-xs text-muted tabular md:block">{compact(h.views)} views</span>}</>} />)}
                </ul>
                {lib.length === 0 && <p className="py-10 text-center text-sm text-muted">No hooks match. Try another category or niche.</p>}
              </Card>
            )}
          </>
        )}

        {view === "Generator" && (
          <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <Card className="h-fit space-y-4 p-4">
              <Field label="Topic or niche"><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. meal prep for students" /></Field>
              <Field label="Hook type">
                <Select value={gCat} onChange={(e) => setGCat(e.target.value as ApiHookCategory | "")}>{HOOK_CATS.map(([c, label]) => <option key={label} value={c}>{label}</option>)}</Select>
              </Field>
              <Field label="How many">
                <Select value={count} onChange={(e) => setCount(Number(e.target.value))}>{[10, 20, 30, 50].map((n) => <option key={n}>{n}</option>)}</Select>
              </Field>
              <Button variant="accent" className="w-full" loading={busy} disabled={topic.trim().length < 2} onClick={generate}>
                <Wand2 className="size-4" /> Generate hooks
              </Button>
              <p className="text-xs text-muted">Generating hooks is free.</p>
            </Card>
            {generated.length === 0 ? (
              <EmptyState icon={Sparkles} title="Generate dozens of hooks in seconds" body="Enter a topic, pick a hook type, and the AI writes opening lines for you." />
            ) : (
              <Card className="px-4">
                <p className="border-b border-line py-3 text-xs text-muted">{generated.length} hooks for “{topic}”</p>
                <ul className="divide-y divide-line">{generated.map((g) => <HookRow key={g.text} text={g.text} category={g.category} source="generator" hooks={hooks} meta={<Badge className="hidden sm:inline-flex">{catLabel(g.category)}</Badge>} />)}</ul>
              </Card>
            )}
          </div>
        )}

        {view === "Watchlist" &&
          (!hooks.loaded ? <Loading /> : hooks.saved.length === 0 ? (
            <EmptyState icon={Bookmark} title="No saved hooks" body="Save hooks from the library, the generator or an analyzed video. They're available inside the script editor." />
          ) : (
            <Card className="px-4"><ul className="divide-y divide-line">{hooks.saved.map((h: ApiSavedHook) => <HookRow key={h.id} text={h.text} category={h.category} source="library" hooks={hooks} meta={h.category ? <Badge className="hidden sm:inline-flex">{catLabel(h.category)}</Badge> : undefined} />)}</ul></Card>
          ))}
      </div>
    </>
  );
}

// ================================================================== Scripts

/** Create-script modal used by the Scripts page and the analysis screen. */
export function NewScriptModal({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: { title?: string; topic?: string; source_video_id?: string; source_idea_id?: string } }) {
  const router = useRouter();
  const { state, toast, refresh } = useStore();
  const hooks = useSavedHooks();
  const [topic, setTopic] = useState(preset?.topic ?? "");
  const [hook, setHook] = useState("");
  const [busy, setBusy] = useState(false);
  // One key per open modal: a double click or network retry can never charge twice.
  const [key] = useState(newKey);

  const start = async () => {
    setBusy(true);
    try {
      const s = await api.createScript(state.activeId, {
        title: (preset?.title ?? topic).trim().slice(0, 200), topic: topic.trim(), hook: hook || undefined,
        source_video_id: preset?.source_video_id, source_idea_id: preset?.source_idea_id,
      }, key);
      void refresh();
      toast("Script ready — 1 credit used");
      router.push(`/scripts/${s.id}`);
    } catch (e) {
      toast(msg(e, "Couldn't write the script."), "error");
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="New script"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!topic.trim() || state.credits < 1} onClick={start}>Generate <CreditCost /></Button></>}>
      <div className="space-y-4">
        <Field label="What's the video about?"><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How I grew to 10K followers in 30 days" /></Field>
        <Field label="Start from a saved hook (optional)">
          <Select value={hook} onChange={(e) => setHook(e.target.value)}>
            <option value="">Let AI write the hook</option>
            {hooks.saved.map((h) => <option key={h.id} value={h.text}>{h.text}</option>)}
          </Select>
        </Field>
        <p className="text-xs text-muted">Generating a script uses 1 credit (you have {state.credits}) — only if it succeeds. Expanding it later is free.</p>
      </div>
    </Modal>
  );
}

export function LiveScripts() {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const { data, error, reload } = useWsData((w) => api.scripts(w));
  if (error) return <LoadError error={error} reload={reload} />;
  return (
    <>
      <PageHeader
        title="Scripts"
        subtitle="Hook, intro, main content, story, CTA and ending — editable and versioned"
        actions={<Button variant="primary" onClick={() => setOpen(true)} disabled={state.credits < 1}><Plus className="size-4" /> New script</Button>}
      />
      {data === null ? <Loading /> : data.length === 0 ? (
        <EmptyState icon={FileText} title="No scripts yet" body="Write one from scratch, or open an analyzed video or idea and click “Create script”." action={<Button variant="primary" onClick={() => setOpen(true)}>Write your first script</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((s) => (
            <Link key={s.id} href={`/scripts/${s.id}`} className="group">
              <Card className="h-full p-4 transition group-hover:border-accent/50">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="line-clamp-2 font-semibold group-hover:text-accent">{s.title}</h2>
                  {s.expanded && <Badge tone="accent">Expanded</Badge>}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted">“{s.hook}”</p>
                <p className="mt-3 text-xs text-subtle">Edited {ago(s.updated_at)} · {s.version_count} version{s.version_count === 1 ? "" : "s"}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {open && <NewScriptModal open onClose={() => setOpen(false)} />}
    </>
  );
}

const BLOCKS: Array<[keyof ApiBlocks, string, string]> = [
  ["hook", "Hook", "First 1–3 seconds. Make a promise."],
  ["intro", "Introduction", "Why should they keep watching?"],
  ["main", "Main content", "The beats that deliver the promise."],
  ["story", "Story flow", "A moment, result or example."],
  ["cta", "Call to action", "One clear ask."],
  ["ending", "Ending", "Close the loop."],
];
const toText = (title: string, b: ApiBlocks) => [`# ${title}`, "", ...BLOCKS.map(([k, label]) => `${label.toUpperCase()}: ${b[k]}`)].join("\n");
const NOTE: Record<string, string> = { generated: "Generated", edit: "Edited", expand: "Expanded", restore: "Restored" };

export function LiveScriptEditor({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useStore();
  const hooks = useSavedHooks();
  const { ws, data: script, setData: setScript, error } = useWsData((w) => api.script(w, id), [id]);
  const [draft, setDraft] = useState<{ title: string; blocks: ApiBlocks } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [history, setHistory] = useState(false);
  const [proj, setProj] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  if (error) return <EmptyState icon={History} title="Script not found" body={error} action={<ButtonLink href="/scripts" variant="primary">All scripts</ButtonLink>} />;
  if (!script) return <Loading />;

  const title = draft?.title ?? script.title;
  const blocks = draft?.blocks ?? script.blocks;
  const dirty = draft !== null && (draft.title !== script.title || JSON.stringify(draft.blocks) !== JSON.stringify(script.blocks));
  const setBlock = (k: keyof ApiBlocks, v: string) => setDraft({ title, blocks: { ...blocks, [k]: v } });
  const words = Object.values(blocks).join(" ").split(/\s+/).filter(Boolean).length;

  const act = async (name: string, fn: () => Promise<ApiScript>, done: string) => {
    setBusy(name);
    try { setScript(await fn()); setDraft(null); toast(done); } catch (e) { toast(msg(e, "Something went wrong."), "error"); } finally { setBusy(null); }
  };
  const exportAs = async (fmt: "markdown" | "json" | "text") => {
    try {
      const { blob, filename } = await api.exportScript(ws, script.id, fmt);
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: filename }).click();
      URL.revokeObjectURL(url);
    } catch (e) { toast(msg(e, "Export failed."), "error"); }
  };

  return (
    <>
      <Link href="/scripts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> All scripts</Link>
      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-3">
          <label className="sr-only" htmlFor="script-title">Script title</label>
          <Input id="script-title" value={title} onChange={(e) => setDraft({ title: e.target.value, blocks })} className="border-transparent bg-transparent px-0 font-display text-2xl! font-medium focus:ring-0" />
          {BLOCKS.map(([k, label, hint]) => (
            <Card key={k} className="p-4">
              <label htmlFor={`b-${k}`} className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-accent">{label}</span>
                <span className="text-xs text-subtle">{hint}</span>
              </label>
              {k === "hook" && hooks.saved.length > 0 && (
                <Select aria-label="Use a saved hook" className="mt-2" value="" onChange={(e) => e.target.value && setBlock("hook", e.target.value)}>
                  <option value="">Use a saved hook…</option>
                  {hooks.saved.map((h) => <option key={h.id} value={h.text}>{h.text}</option>)}
                </Select>
              )}
              <Textarea id={`b-${k}`} rows={k === "main" ? 5 : 2} value={blocks[k]} onChange={(e) => setBlock(k, e.target.value)} className="mt-2 border-transparent bg-surface-2 focus:bg-surface" />
            </Card>
          ))}
        </div>

        <aside className="space-y-3 xl:sticky xl:top-20 xl:h-fit">
          <Card className="space-y-2 p-4">
            <Button variant="primary" className="w-full" loading={busy === "save"} disabled={!dirty || !title.trim()} onClick={() => act("save", () => api.updateScript(ws, script.id, { title: title.trim(), blocks }), "Saved as a new version")}>
              <Save className="size-4" /> {dirty ? "Save changes" : "Saved"}
            </Button>
            <Button className="w-full" loading={busy === "expand"} disabled={dirty || busy !== null} title={dirty ? "Save first" : undefined} onClick={() => act("expand", () => api.expandScript(ws, script.id), "Expanded — no credit used")}>
              <Maximize2 className="size-4" /> Expand script <Badge tone="good">Free</Badge>
            </Button>
            <Button className="w-full" onClick={() => { void navigator.clipboard.writeText(toText(title, blocks)); toast("Script copied"); }}><Copy className="size-4" /> Copy to clipboard</Button>
            <Button className="w-full" onClick={() => setProj(true)}><FolderPlus className="size-4" /> Add to project</Button>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {(["markdown", "json", "text"] as const).map((f) => <Button key={f} variant="ghost" className="px-2 text-xs" disabled={dirty} onClick={() => exportAs(f)}><Download className="size-3.5" />{f === "markdown" ? "MD" : f === "json" ? "JSON" : "Text"}</Button>)}
            </div>
          </Card>
          <Card className="space-y-2 p-4 text-[13px]">
            <p className="flex justify-between"><span className="text-muted">Words</span><span className="tabular">{words}</span></p>
            <p className="flex justify-between"><span className="text-muted">Est. length</span><span className="tabular">~{Math.round(words / 2.6)}s</span></p>
            <p className="flex justify-between"><span className="text-muted">Versions</span><button className="cursor-pointer font-semibold text-accent" onClick={() => setHistory(true)}>{script.versions.length} · view</button></p>
            {script.source_video_id && <p className="flex justify-between gap-2"><span className="text-muted">Source</span><Link className="truncate font-semibold text-accent" href={`/videos/${script.source_video_id}`}>Analyzed video</Link></p>}
          </Card>
          <Button variant="danger" className="w-full" onClick={() => setConfirmDel(true)}><Trash2 className="size-4" /> Delete script</Button>
        </aside>
      </div>

      <Modal open={history} onClose={() => setHistory(false)} title="Version history" wide>
        <ul className="divide-y divide-line">
          {script.versions.map((v, i) => (
            <li key={v.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="min-w-0 flex-1"><span className="font-semibold">{i === 0 ? "Current" : NOTE[v.note] ?? "Version"}</span> <span className="text-muted">· {ago(v.created_at)}</span><span className="mt-0.5 block truncate text-xs text-muted">{v.blocks.hook}</span></span>
              {i > 0 && <Button loading={busy === v.id} onClick={() => { setHistory(false); void act(v.id, () => api.restoreScript(ws, script.id, v.id), "Version restored"); }}>Restore</Button>}
            </li>
          ))}
        </ul>
      </Modal>
      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title="Delete script?"
        footer={<><Button onClick={() => setConfirmDel(false)}>Cancel</Button><Button variant="danger" onClick={async () => { try { await api.deleteScript(ws, script.id); router.push("/scripts"); } catch (e) { toast(msg(e, "Couldn't delete."), "error"); } }}>Delete</Button></>}>
        <p className="text-sm text-muted">This removes “{script.title}” and all its versions. The credit used to generate it isn&apos;t refunded.</p>
      </Modal>
      {proj && <LiveAddToProject open onClose={() => setProj(false)} kind="script" refId={script.id} />}
    </>
  );
}

// ================================================================== Projects

export function LiveAddToProject({ open, onClose, kind, refId }: { open: boolean; onClose: () => void; kind: ApiItemKind; refId: string }) {
  const { toast } = useStore();
  const { ws, data } = useWsData((w) => api.projects(w));
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const inProject = (p: ApiProject) => p.items.some((i) => i.kind === kind && i.ref_id === refId);
  const add = async (projectId: string, label: string) => {
    setBusy(true);
    try { await api.addProjectItem(ws, projectId, kind, refId); toast(`Added to “${label}”`); onClose(); } catch (e) { toast(msg(e, "Couldn't add it."), "error"); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add to project">
      {data === null ? <Skeleton className="h-20 w-full" /> : (
        <ul className="space-y-1">
          {data.map((p) => (
            <li key={p.id}>
              <button disabled={busy} onClick={() => add(p.id, p.name)} className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-surface-2 disabled:opacity-50">
                <FolderOpen className="size-4 text-muted" />
                <span className="flex-1 truncate">{p.name}</span>
                {inProject(p) && <Check className="size-4 text-accent" aria-label="Already in this project" />}
              </button>
            </li>
          ))}
          {data.length === 0 && <li className="py-2 text-sm text-muted">No projects yet — create one below.</li>}
        </ul>
      )}
      <form className="mt-4 flex gap-2 border-t border-line pt-4" onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try { const p = await api.createProject(ws, name.trim()); await add(p.id, p.name); setName(""); } catch (err) { toast(msg(err, "Couldn't create the project."), "error"); setBusy(false); }
      }}>
        <label className="sr-only" htmlFor="new-project">New project name</label>
        <Input id="new-project" value={name} onChange={(e) => setName(e.target.value)} placeholder="New project name" />
        <Button type="submit" variant="primary" loading={busy} disabled={!name.trim()}>Create</Button>
      </form>
    </Modal>
  );
}

export function LiveProjects() {
  const { toast } = useStore();
  const { ws, data, setData, error, reload } = useWsData((w) => api.projects(w));
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  if (error) return <LoadError error={error} reload={reload} />;
  const create = async () => {
    setBusy(true);
    try {
      const p = await api.createProject(ws, name.trim(), desc.trim());
      setData((cur) => [p, ...(cur ?? [])]);
      toast(`Created “${p.name}”`); setName(""); setDesc(""); setOpen(false);
    } catch (e) { toast(msg(e, "Couldn't create the project."), "error"); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Projects" subtitle="Group videos, ideas and scripts by campaign or client" actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-4" /> New project</Button>} />
      {data === null ? <Loading /> : data.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No projects yet" body="Projects keep research and scripts for one campaign in one place." action={<Button variant="primary" onClick={() => setOpen(true)}>Create a project</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => {
            const count = (k: string) => p.items.filter((i) => i.kind === k).length;
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="group">
                <Card className="h-full p-4 transition group-hover:border-accent/50">
                  <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent"><FolderOpen className="size-4" /></span>
                  <h2 className="mt-3 font-semibold group-hover:text-accent">{p.name}</h2>
                  {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>}
                  <p className="mt-3 text-xs text-subtle tabular">{count("video")} videos · {count("idea")} ideas · {count("script")} scripts · created {ago(p.created_at)}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New project"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={busy} disabled={!name.trim()} onClick={create}>Create</Button></>}>
        <div className="space-y-4">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. November launch" /></Field>
          <Field label="Description (optional)"><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        </div>
      </Modal>
    </>
  );
}

const ITEM_ICON = { video: VideoIcon, idea: Lightbulb, script: FileText };
const itemHref = (kind: ApiItemKind, id: string) => (kind === "video" ? `/videos/${id}` : kind === "script" ? `/scripts/${id}` : "/ideas");

export function LiveProjectDetail({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useStore();
  const { ws, data: p, setData, error } = useWsData((w) => api.project(w, id), [id]);
  const { data: all } = useWsData((w) => api.projects(w));
  const [confirm, setConfirm] = useState(false);
  if (error) return <EmptyState icon={FolderOpen} title="Project not found" body="It may belong to another workspace." action={<ButtonLink href="/projects" variant="primary">All projects</ButtonLink>} />;
  if (!p) return <Loading />;
  const others = (all ?? []).filter((x) => x.id !== p.id);

  const run = async (fn: () => Promise<ApiProject | null>, done: string) => {
    try { const r = await fn(); if (r) setData(r); toast(done); } catch (e) { toast(msg(e, "Something went wrong."), "error"); }
  };
  const exportJson = () => {
    download(`${p.name.replace(/\W+/g, "-").toLowerCase()}.json`, JSON.stringify({ project: p.name, description: p.description, items: p.items }, null, 2), "application/json");
    void api.logExport(ws, "Project", p.name, "JSON").catch(() => {});
  };

  return (
    <>
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> All projects</Link>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-medium">{p.name}</h1>
          {p.description && <p className="mt-1 text-sm text-muted">{p.description}</p>}
        </div>
        <Button onClick={exportJson}><Download className="size-4" /> Export</Button>
        <Button variant="danger" onClick={() => setConfirm(true)}><Trash2 className="size-4" /> Delete</Button>
      </div>
      {p.items.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Nothing here yet" body="Use “Add to project” on any video, idea or script." action={<ButtonLink href="/videos" variant="primary">Browse videos</ButtonLink>} />
      ) : (
        <Card className="px-4">
          <ul className="divide-y divide-line">
            {p.items.map((it) => {
              const Icon = ITEM_ICON[it.kind];
              return (
                <li key={it.kind + it.ref_id} className="flex items-center gap-3 py-3">
                  {it.thumbnail_url
                    ? <span className="size-10 flex-none rounded-md bg-cover bg-center" style={{ backgroundImage: `url("${it.thumbnail_url}")` }} aria-hidden />
                    : <span className="grid size-10 flex-none place-items-center rounded-lg bg-surface-2 text-muted"><Icon className="size-4" /></span>}
                  <div className="min-w-0 flex-1">
                    <Link href={itemHref(it.kind, it.ref_id)} className="block truncate text-sm font-medium hover:text-accent">{it.title}</Link>
                    <p className="truncate text-xs text-muted"><span className="capitalize">{it.kind}</span>{it.subtitle && ` · ${it.subtitle}`}</p>
                  </div>
                  {others.length > 0 && (
                    <Select aria-label="Move to project" className="hidden w-40 sm:block" value="" onChange={(e) => {
                      const to = e.target.value;
                      if (to) void run(async () => { await api.addProjectItem(ws, to, it.kind, it.ref_id); return api.project(ws, p.id); }, "Moved");
                    }}>
                      <option value="">Move to…</option>
                      {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </Select>
                  )}
                  <Button variant="ghost" aria-label="Remove from project" onClick={() => run(() => api.removeProjectItem(ws, p.id, it.kind, it.ref_id), "Removed")}><X className="size-4" /></Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Delete project?"
        footer={<><Button onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" onClick={async () => { try { await api.deleteProject(ws, p.id); router.push("/projects"); } catch (e) { toast(msg(e, "Couldn't delete."), "error"); } }}>Delete</Button></>}>
        <p className="text-sm text-muted">The project is removed. Videos, ideas and scripts inside it are kept.</p>
      </Modal>
    </>
  );
}

// ================================================================== Exports

export function LiveExports() {
  const { toast } = useStore();
  const { ws, data, setData, error, reload } = useWsData((w) => api.exports(w));
  const [busy, setBusy] = useState<string | null>(null);
  const log = async (kind: string, title: string, format: string) => {
    try { const e = await api.logExport(ws, kind, title, format); setData((cur) => [e, ...(cur ?? [])]); } catch { /* history is best effort */ }
  };

  const gather = async () => {
    const [ideas, scripts, projects, saved] = await Promise.all([api.ideas(ws), api.scripts(ws), api.projects(ws), api.savedHooks(ws)]);
    const full = await Promise.all(scripts.map((s) => api.script(ws, s.id)));
    return { ideas, scripts: full, projects, saved };
  };
  const options = useMemo(() => [
    { id: "ws", title: "Workspace (JSON)", body: "Ideas, scripts, projects and saved hooks.", icon: FileJson, run: async () => {
      const d = await gather();
      download("workspace.json", JSON.stringify({ exportedAt: new Date().toISOString(), ideas: d.ideas, scripts: d.scripts.map((s) => ({ id: s.id, title: s.title, blocks: s.blocks, updated_at: s.updated_at })), projects: d.projects, savedHooks: d.saved.map((h) => h.text) }, null, 2), "application/json");
      await log("Workspace", "Full workspace", "JSON");
    } },
    { id: "md", title: "All scripts (Markdown)", body: "Every script in this workspace as one document.", icon: FileText, run: async () => {
      const d = await gather();
      download("scripts.md", d.scripts.map((s) => toText(s.title, s.blocks)).join("\n\n---\n\n") || "# No scripts yet", "text/markdown");
      await log("Scripts", `${d.scripts.length} scripts`, "Markdown");
    } },
    { id: "llm", title: "Export for LLM", body: "Compact text of your ideas and scripts — paste into any AI tool.", icon: Download, run: async () => {
      const d = await gather();
      const txt = ["# Smart Content research", ...d.ideas.map((i) => `- Idea: ${i.title} — ${i.format}. ${i.contrast}`), ...d.scripts.map((s) => `## Script: ${s.title}\nHook: ${s.blocks.hook}`)].join("\n\n");
      await navigator.clipboard.writeText(txt);
      await log("Export for LLM", "Workspace research", "Text");
      toast("Copied for LLM");
    } },
    { id: "pdf", title: "PDF report", body: "Print any page to PDF from your browser.", icon: FileText, badge: "Browser print", run: async () => window.print() },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [ws]);

  return (
    <>
      <PageHeader title="Exports" subtitle="Download your research and scripts, or copy them for another AI tool" />
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((o) => (
          <Card key={o.id} className="flex items-start gap-4 p-4">
            <span className="grid size-10 flex-none place-items-center rounded-lg bg-accent-soft text-accent"><o.icon className="size-5" /></span>
            <div className="flex-1">
              <p className="flex items-center gap-2 font-semibold">{o.title}{"badge" in o && o.badge && <Badge>{o.badge}</Badge>}</p>
              <p className="mt-0.5 text-sm text-muted">{o.body}</p>
            </div>
            <Button loading={busy === o.id} onClick={async () => { setBusy(o.id); try { await o.run(); } catch (e) { toast(msg(e, "Export failed."), "error"); } finally { setBusy(null); } }}>Export</Button>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 mt-8 text-sm font-semibold">Recent exports</h2>
      {error ? <LoadError error={error} reload={reload} /> : data === null ? <Loading /> : data.length === 0 ? (
        <EmptyState icon={History} title="No exports yet" body="Exports from anywhere in the app are listed here." />
      ) : (
        <Card className="px-4">
          <ul className="divide-y divide-line">
            {data.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-3 text-sm">
                <Badge>{e.format}</Badge>
                <span className="flex-1 truncate"><span className="text-muted">{e.kind}:</span> {e.title}</span>
                <span className="text-xs text-subtle">{ago(e.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
