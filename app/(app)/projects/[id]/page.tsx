import { LIVE } from "@/lib/config";
import { LiveProjectDetail } from "@/components/features/live-create";
import { ProjectDetail } from "./project-detail";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return LIVE ? <LiveProjectDetail id={id} /> : <ProjectDetail id={id} />;
}
