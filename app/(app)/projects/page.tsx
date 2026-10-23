"use client";

import { LIVE } from "@/lib/config";
import { LiveProjects } from "@/components/features/live-create";
import Link from "next/link";
import { useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { ago } from "@/lib/utils";
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Textarea } from "@/components/ui";

function DemoProjects() {
  const { ws, createProject, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  return (
    <>
      <PageHeader title="Projects" subtitle="Group videos, ideas and scripts by campaign or client" actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-4" /> New project</Button>} />
      {ws.projects.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No projects yet" body="Projects keep research and scripts for one campaign in one place." action={<Button variant="primary" onClick={() => setOpen(true)}>Create a project</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ws.projects.map((p) => {
            const count = (k: string) => p.items.filter((i) => i.kind === k).length;
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="group">
                <Card className="h-full p-4 transition group-hover:border-accent/50">
                  <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent"><FolderOpen className="size-4" /></span>
                  <h2 className="mt-3 font-semibold group-hover:text-accent">{p.name}</h2>
                  {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>}
                  <p className="mt-3 text-xs text-subtle tabular">{count("video")} videos · {count("idea")} ideas · {count("script")} scripts · created {ago(p.createdAt)}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New project"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" disabled={!name.trim()} onClick={() => { createProject(name.trim(), desc.trim()); toast(`Created “${name.trim()}”`); setName(""); setDesc(""); setOpen(false); }}>Create</Button></>}
      >
        <div className="space-y-4">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. November launch" /></Field>
          <Field label="Description (optional)"><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        </div>
      </Modal>
    </>
  );
}

export default function ProjectsPage() {
  return LIVE ? <LiveProjects /> : <DemoProjects />;
}
