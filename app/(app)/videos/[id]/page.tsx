import { notFound } from "next/navigation";
import { videos } from "@/lib/mock/data";
import { AnalysisView } from "./analysis-view";

export function generateStaticParams() {
  return videos.map((v) => ({ id: v.id }));
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!videos.some((v) => v.id === id)) notFound();
  return <AnalysisView id={id} />;
}
