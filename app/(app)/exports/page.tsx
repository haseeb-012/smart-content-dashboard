"use client";

import { LIVE } from "@/lib/config";
import { LiveExports } from "@/components/features/live-create";
import { Download, FileJson, FileText, History } from "lucide-react";
import { useStore } from "@/lib/store";
import { videos } from "@/lib/mock/data";
import { scriptToText } from "@/lib/generate";
import { ago, download } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";

function DemoExports() {
  const { ws, logExport, toast } = useStore();

  const bundle = () => ({
    exportedAt: new Date().toISOString(),
    library: ws.library.map((id) => videos.find((v) => v.id === id)),
    analyses: Object.values(ws.analyses).filter((a) => a.status === "complete"),
    ideas: ws.ideas,
    scripts: ws.scripts.map((s) => ({ id: s.id, title: s.title, blocks: s.blocks, updatedAt: s.updatedAt, sourceVideoId: s.sourceVideoId })),
    projects: ws.projects,
    savedHooks: ws.savedHooks,
  });

  const options = [
    { title: "Workspace (JSON)", body: "Library, analyses, ideas, scripts, projects and saved hooks.", icon: FileJson, run: () => { download("workspace.json", JSON.stringify(bundle(), null, 2), "application/json"); logExport("Workspace", "Full workspace", "JSON"); } },
    { title: "All scripts (Markdown)", body: "Every script in this workspace as one document.", icon: FileText, run: () => { download("scripts.md", ws.scripts.map((s) => scriptToText(s.title, s.blocks)).join("\n\n---\n\n") || "# No scripts yet", "text/markdown"); logExport("Scripts", `${ws.scripts.length} scripts`, "Markdown"); } },
    { title: "Export for LLM", body: "Compact, token-efficient text of your ideas and analyses — paste into any AI tool.", icon: Download, run: () => {
      const txt = [
        "# Smart Content research",
        ...Object.values(ws.analyses).filter((a) => a.status === "complete").map((a) => { const v = videos.find((x) => x.id === a.videoId); return `## ${v?.title} (${v?.outlier}x)\nHook: ${a.hook}\nFormat: ${a.format}`; }),
        ...ws.ideas.map((i) => `- Idea: ${i.title} — ${i.format}`),
      ].join("\n\n");
      navigator.clipboard.writeText(txt); logExport("Export for LLM", "Workspace research", "Text"); toast("Copied for LLM");
    } },
    { title: "PDF report", body: "Print any page to PDF from your browser. A designed PDF export ships with the backend.", icon: FileText, run: () => window.print(), badge: "Browser print" },
  ];

  return (
    <>
      <PageHeader title="Exports" subtitle="Download your research and scripts, or copy them for another AI tool" />
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((o) => (
          <Card key={o.title} className="flex items-start gap-4 p-4">
            <span className="grid size-10 flex-none place-items-center rounded-lg bg-accent-soft text-accent"><o.icon className="size-5" /></span>
            <div className="flex-1">
              <p className="flex items-center gap-2 font-semibold">{o.title}{o.badge && <Badge>{o.badge}</Badge>}</p>
              <p className="mt-0.5 text-sm text-muted">{o.body}</p>
            </div>
            <Button onClick={o.run}>Export</Button>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 mt-8 text-sm font-semibold">Recent exports</h2>
      {ws.exports.length === 0 ? (
        <EmptyState icon={History} title="No exports yet" body="Exports from anywhere in the app are listed here." />
      ) : (
        <Card className="px-4">
          <ul className="divide-y divide-line">
            {ws.exports.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-3 text-sm">
                <Badge>{e.format}</Badge>
                <span className="flex-1 truncate"><span className="text-muted">{e.kind}:</span> {e.title}</span>
                <span className="text-xs text-subtle">{ago(e.at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

export default function ExportsPage() {
  return LIVE ? <LiveExports /> : <DemoExports />;
}
