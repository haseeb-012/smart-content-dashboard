"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy, Download, FolderPlus, History, Maximize2, Save, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { ScriptBlocks } from "@/lib/types";
import { videos } from "@/lib/mock/data";
import { scriptToText } from "@/lib/generate";
import { ago, download } from "@/lib/utils";
import { Badge, Button, ButtonLink, Card, EmptyState, Input, Modal, Select, Textarea } from "@/components/ui";
import { AddToProjectModal } from "@/components/features/add-to-project";

const BLOCKS: Array<[keyof ScriptBlocks, string, string]> = [
  ["hook", "Hook", "First 1–3 seconds. Make a promise."],
  ["intro", "Introduction", "Why should they keep watching?"],
  ["main", "Main content", "The beats that deliver the promise."],
  ["story", "Story flow", "A moment, result or example."],
  ["cta", "Call to action", "One clear ask."],
  ["ending", "Ending", "Close the loop."],
];

export function ScriptEditor({ id }: { id: string }) {
  const router = useRouter();
  const { ws, saveScript, expand, deleteScript, logExport, toast } = useStore();
  const script = ws.scripts.find((s) => s.id === id);
  const [title, setTitle] = useState(script?.title ?? "");
  const [blocks, setBlocks] = useState<ScriptBlocks | null>(script?.blocks ?? null);
  const [history, setHistory] = useState(false);
  const [proj, setProj] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  // Re-sync local edits when the stored script changes (e.g. after Expand or loading from storage).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror external store into editable draft
    if (script) { setBlocks(script.blocks); setTitle(script.title); }
  }, [script?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!script || !blocks)
    return <EmptyState icon={History} title="Script not found" body="It may belong to another workspace or have been deleted." action={<ButtonLink href="/scripts" variant="primary">All scripts</ButtonLink>} />;

  const dirty = title !== script.title || JSON.stringify(blocks) !== JSON.stringify(script.blocks);
  const text = scriptToText(title, blocks);
  const source = videos.find((v) => v.id === script.sourceVideoId);
  const words = Object.values(blocks).join(" ").split(/\s+/).filter(Boolean).length;

  const exportAs = (fmt: "Markdown" | "JSON" | "Text") => {
    if (fmt === "JSON") download(`${script.id}.json`, JSON.stringify({ title, ...blocks }, null, 2), "application/json");
    else download(`${script.id}.${fmt === "Markdown" ? "md" : "txt"}`, text, fmt === "Markdown" ? "text/markdown" : "text/plain");
    logExport("Script", title, fmt);
  };

  return (
    <>
      <Link href="/scripts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> All scripts</Link>
      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-3">
          <label className="sr-only" htmlFor="script-title">Script title</label>
          <Input id="script-title" value={title} onChange={(e) => setTitle(e.target.value)} className="border-transparent bg-transparent px-0 font-display text-2xl font-medium focus:ring-0" />
          {BLOCKS.map(([k, label, hint]) => (
            <Card key={k} className="p-4">
              <label htmlFor={`b-${k}`} className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-accent">{label}</span>
                <span className="text-xs text-subtle">{hint}</span>
              </label>
              {k === "hook" && ws.savedHooks.length > 0 && (
                <Select aria-label="Use a saved hook" className="mt-2" value="" onChange={(e) => e.target.value && setBlocks({ ...blocks, hook: e.target.value })}>
                  <option value="">Use a saved hook…</option>
                  {ws.savedHooks.map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>
              )}
              <Textarea id={`b-${k}`} rows={k === "main" ? 5 : 2} value={blocks[k]} onChange={(e) => setBlocks({ ...blocks, [k]: e.target.value })} className="mt-2 border-transparent bg-surface-2 focus:bg-surface" />
            </Card>
          ))}
        </div>

        <aside className="space-y-3 xl:sticky xl:top-20 xl:h-fit">
          <Card className="space-y-2 p-4">
            <Button variant="primary" className="w-full" disabled={!dirty} onClick={() => { saveScript(script.id, title, blocks); toast("Saved as a new version"); }}>
              <Save className="size-4" /> {dirty ? "Save changes" : "Saved"}
            </Button>
            <Button className="w-full" disabled={dirty} title={dirty ? "Save first" : undefined} onClick={() => { expand(script.id); toast("Expanded — no credit used"); }}>
              <Maximize2 className="size-4" /> Expand script <Badge tone="good">Free</Badge>
            </Button>
            <Button className="w-full" onClick={() => { navigator.clipboard.writeText(text); toast("Script copied"); }}><Copy className="size-4" /> Copy to clipboard</Button>
            <Button className="w-full" onClick={() => setProj(true)}><FolderPlus className="size-4" /> Add to project</Button>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {(["Markdown", "JSON", "Text"] as const).map((f) => <Button key={f} variant="ghost" className="px-2 text-xs" onClick={() => exportAs(f)}><Download className="size-3.5" />{f === "Markdown" ? "MD" : f}</Button>)}
            </div>
          </Card>
          <Card className="space-y-2 p-4 text-[13px]">
            <p className="flex justify-between"><span className="text-muted">Words</span><span className="tabular">{words}</span></p>
            <p className="flex justify-between"><span className="text-muted">Est. length</span><span className="tabular">~{Math.round(words / 2.6)}s</span></p>
            <p className="flex justify-between"><span className="text-muted">Versions</span><button className="cursor-pointer font-semibold text-accent" onClick={() => setHistory(true)}>{script.versions.length} · view</button></p>
            {source && <p className="flex justify-between gap-2"><span className="text-muted">Source</span><Link className="truncate font-semibold text-accent" href={`/videos/${source.id}`}>{source.title}</Link></p>}
          </Card>
          <Button variant="danger" className="w-full" onClick={() => setConfirmDel(true)}><Trash2 className="size-4" /> Delete script</Button>
        </aside>
      </div>

      <Modal open={history} onClose={() => setHistory(false)} title="Version history" wide>
        <ul className="divide-y divide-line">
          {script.versions.map((v, i) => (
            <li key={v.at + i} className="flex items-center gap-3 py-3 text-sm">
              <span className="flex-1"><span className="font-semibold">{i === 0 ? "Current" : `Version ${script.versions.length - i}`}</span> <span className="text-muted">· {ago(v.at)}</span><span className="mt-0.5 block truncate text-xs text-muted">{v.blocks.hook}</span></span>
              {i > 0 && <Button onClick={() => { setBlocks(v.blocks); setHistory(false); toast("Version loaded — save to keep it"); }}>Restore</Button>}
            </li>
          ))}
        </ul>
      </Modal>
      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title="Delete script?" footer={<><Button onClick={() => setConfirmDel(false)}>Cancel</Button><Button variant="danger" onClick={() => { deleteScript(script.id); router.push("/scripts"); }}>Delete</Button></>}>
        <p className="text-sm text-muted">This removes “{script.title}” and all its versions. The credit used to generate it isn&apos;t refunded.</p>
      </Modal>
      <AddToProjectModal open={proj} onClose={() => setProj(false)} item={{ kind: "script", id: script.id }} />
    </>
  );
}
