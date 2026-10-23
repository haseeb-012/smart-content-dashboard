"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Download, FileText, FolderOpen, Lightbulb, Trash2, Video as VideoIcon, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { videos } from "@/lib/mock/data";
import { download } from "@/lib/utils";
import { Button, ButtonLink, Card, EmptyState, Modal, Select } from "@/components/ui";
import { VideoThumb } from "@/components/features/video-card";
import type { Project } from "@/lib/types";

export function ProjectDetail({ id }: { id: string }) {
  const router = useRouter();
  const { ws, removeFromProject, addToProject, deleteProject, logExport, toast } = useStore();
  const [confirm, setConfirm] = useState(false);
  const p = ws.projects.find((x) => x.id === id);
  if (!p) return <EmptyState icon={FolderOpen} title="Project not found" body="It may belong to another workspace." action={<ButtonLink href="/projects" variant="primary">All projects</ButtonLink>} />;

  const resolve = (it: Project["items"][number]) => {
    if (it.kind === "video") { const v = videos.find((x) => x.id === it.id); return v && { title: v.title, href: `/videos/${v.id}`, v }; }
    if (it.kind === "idea") { const i = ws.ideas.find((x) => x.id === it.id); return i && { title: i.title, href: "/ideas" }; }
    const s = ws.scripts.find((x) => x.id === it.id); return s && { title: s.title, href: `/scripts/${s.id}` };
  };
  const others = ws.projects.filter((x) => x.id !== p.id);
  const icon = { video: VideoIcon, idea: Lightbulb, script: FileText };

  const exportJson = () => {
    download(`${p.name.replace(/\W+/g, "-").toLowerCase()}.json`, JSON.stringify({ project: p.name, description: p.description, items: p.items.map((i) => ({ ...i, title: resolve(i)?.title })) }, null, 2), "application/json");
    logExport("Project", p.name, "JSON");
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
              const r = resolve(it);
              const Icon = icon[it.kind];
              return (
                <li key={it.kind + it.id} className="flex items-center gap-3 py-3">
                  {r && "v" in r && r.v ? <VideoThumb video={r.v} className="w-10 flex-none rounded-md" /> : <span className="grid size-10 flex-none place-items-center rounded-lg bg-surface-2 text-muted"><Icon className="size-4" /></span>}
                  <div className="min-w-0 flex-1">
                    <Link href={r?.href ?? "#"} className="block truncate text-sm font-medium hover:text-accent">{r?.title ?? "Deleted item"}</Link>
                    <p className="text-xs capitalize text-muted">{it.kind}</p>
                  </div>
                  {others.length > 0 && (
                    <Select aria-label="Move to project" className="hidden w-40 sm:block" value="" onChange={(e) => { if (e.target.value) { addToProject(e.target.value, it); toast("Moved"); } }}>
                      <option value="">Move to…</option>
                      {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </Select>
                  )}
                  <Button variant="ghost" aria-label="Remove from project" onClick={() => removeFromProject(p.id, it)}><X className="size-4" /></Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Delete project?" footer={<><Button onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" onClick={() => { deleteProject(p.id); router.push("/projects"); }}>Delete</Button></>}>
        <p className="text-sm text-muted">The project is removed. Videos, ideas and scripts inside it are kept.</p>
      </Modal>
    </>
  );
}
