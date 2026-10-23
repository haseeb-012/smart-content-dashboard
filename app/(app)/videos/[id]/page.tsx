import { notFound } from "next/navigation";
import { videos } from "@/lib/mock/data";
import { LIVE } from "@/lib/config";
import { LiveAnalysis } from "@/components/features/live-analysis";
import { AnalysisView } from "./analysis-view";

export function generateStaticParams() {
  return videos.map((v) => ({ id: v.id }));
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Live video IDs come from the API (ingested after deploy); demo IDs are known at build time.
  if (LIVE) return <LiveAnalysis id={id} />;
  if (!videos.some((v) => v.id === id)) notFound();
  return <AnalysisView id={id} />;
}
