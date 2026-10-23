"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { useAction, useStore } from "@/lib/store";
import { ago } from "@/lib/utils";
import { Badge, Button, Card, CreditCost, EmptyState, Field, Input, Modal, PageHeader, Select } from "@/components/ui";

export default function ScriptsPage() {
  const { ws, createScript, state } = useStore();
  const run = useAction();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [hook, setHook] = useState("");

  const start = () => {
    const id = run(() => createScript({ title: topic.trim(), topic: topic.trim(), hook: hook || undefined }));
    if (id) router.push(`/scripts/${id}`);
  };

  return (
    <>
      <PageHeader
        title="Scripts"
        subtitle="Hook, intro, main content, story, CTA and ending — editable and versioned"
        actions={<Button variant="primary" onClick={() => setOpen(true)} disabled={state.credits < 1}><Plus className="size-4" /> New script</Button>}
      />
      {ws.scripts.length === 0 ? (
        <EmptyState icon={FileText} title="No scripts yet" body="Write one from scratch, or open an analyzed video or idea and click “Create script”." action={<Button variant="primary" onClick={() => setOpen(true)}>Write your first script</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ws.scripts.map((s) => (
            <Link key={s.id} href={`/scripts/${s.id}`} className="group">
              <Card className="h-full p-4 transition group-hover:border-accent/50">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="line-clamp-2 font-semibold group-hover:text-accent">{s.title}</h2>
                  {s.expanded && <Badge tone="accent">Expanded</Badge>}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted">“{s.blocks.hook}”</p>
                <p className="mt-3 text-xs text-subtle">Edited {ago(s.updatedAt)} · {s.versions.length} version{s.versions.length > 1 ? "s" : ""}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New script"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" disabled={!topic.trim()} onClick={start}>Generate <CreditCost /></Button></>}
      >
        <div className="space-y-4">
          <Field label="What's the video about?"><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How I grew to 10K followers in 30 days" /></Field>
          <Field label="Start from a saved hook (optional)">
            <Select value={hook} onChange={(e) => setHook(e.target.value)}>
              <option value="">Let AI write the hook</option>
              {ws.savedHooks.map((h) => <option key={h} value={h}>{h}</option>)}
            </Select>
          </Field>
          <p className="text-xs text-muted">Generating a script uses 1 credit (you have {state.credits}). Expanding it later is free.</p>
        </div>
      </Modal>
    </>
  );
}
