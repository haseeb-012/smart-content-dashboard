import { Suspense } from "react";
import { VideosView } from "./videos-view";

export default function VideosPage() {
  return (
    <Suspense>
      <VideosView />
    </Suspense>
  );
}
