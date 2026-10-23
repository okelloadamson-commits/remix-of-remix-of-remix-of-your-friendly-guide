import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const MuxPlayer = lazy(() => import("@mux/mux-player-react"));

export function DirectVideoPlayer({ src, poster, title }: { src: string; poster?: string; title: string }) {
  return (
    <div className="direct-video-player relative h-full w-full overflow-hidden" onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}>
      <Suspense fallback={<div className="flex h-full items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
        <MuxPlayer key={src} src={src} poster={poster} streamType="on-demand" preload="metadata" playsInline
          disableTracking disableCookies nohotkeys metadata={{ video_title: title }} title={title}
          className="h-full w-full" />
      </Suspense>
    </div>
  );
}