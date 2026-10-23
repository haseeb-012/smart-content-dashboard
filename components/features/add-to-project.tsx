"use client";

import { useState } from "react";
import { Check, FolderOpen } from "lucide-react";
import type { Project } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button, Input, Modal } from "@/components/ui";

export function AddToProjectModal({ open, onClose, item }: { open: boolean; onClose: () => void; item: Project["items"][number] }) {
  const { ws, addToProject, createProject, toast } = useStore();
  const [name, setName] = useState("");
  const inProject = (p: Project) => p.items.some((i) => i.kind === item.kind && i.id === item.id);

  return (
    <Modal open={open} onClose={onClose} title="Add to project">
      <ul className="space-y-1">
        {ws.projects.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => { addToProject(p.id, item); toast(`Added to “${p.name}”`); onClose(); }}
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-surface-2"
            >
              <FolderOpen className="size-4 text-muted" />
              <span className="flex-1 truncate">{p.name}</span>
              {inProject(p) && <Check className="size-4 text-accent" aria-label="Already in this project" />}
            </button>
          </li>
        ))}
        {ws.projects.length === 0 && <li className="py-2 text-sm text-muted">No projects yet — create one below.</li>}
      </ul>
      <form
        className="mt-4 flex gap-2 border-t border-line pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const id = createProject(name.trim());
          addToProject(id, item);
          toast(`Created “${name.trim()}” and added the item`);
          setName("");
          onClose();
        }}
      >
        <label className="sr-only" htmlFor="new-project">New project name</label>
        <Input id="new-project" value={name} onChange={(e) => setName(e.target.value)} placeholder="New project name" />
        <Button type="submit" variant="primary" disabled={!name.trim()}>Create</Button>
      </form>
    </Modal>
  );
}
