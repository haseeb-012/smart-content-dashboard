import { Suspense } from "react";
import { LIVE } from "@/lib/config";
import { LiveVideos } from "@/components/features/live-videos";
import { VideosView } from "./videos-view";

export default function VideosPage() {
  return <Suspense>{LIVE ? <LiveVideos /> : <VideosView />}</Suspense>;
}
