import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

interface DownloadFrameDialogProps {
  open: boolean;
  url: string;
  title: string;
  fallbackUrl?: string;
  fileId?: string;
  onClose: () => void;
}

export function DownloadFrameDialog({
  open,
  url,
  title,
  fallbackUrl,
  fileId,
  onClose,
}: DownloadFrameDialogProps) {
  const closeRef = useRef(onClose);
  const [showFallback, setShowFallback] = useState(false);

  // Parent player updates must not reload the embedded confirmation page.
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setShowFallback(false);
    const previousOverflow = document.body.style.overflow;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, url]);

  // A quota check may reveal the alternative, but never navigates the iframe.
  useEffect(() => {
    if (!open || !fileId || !fallbackUrl) return;
    const controller = new AbortController();
    fetch(`/api/public/drive-check?id=${encodeURIComponent(fileId)}`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data: { blocked?: boolean }) => {
        if (!controller.signal.aborted && data.blocked) setShowFallback(true);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [open, url, fileId, fallbackUrl]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-md:w-[calc(100vw-1rem)] max-md:max-w-[calc(100vw-1rem)] h-[78dvh] sm:h-[85vh] bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-2xl max-md:border-[3px] max-md:border-transparent max-md:[background:linear-gradient(var(--background),var(--background))_padding-box,conic-gradient(from_0deg,#ff0000,#ff7f00,#ffff00,#00ff00,#00ffff,#0000ff,#8b00ff,#ff0000)_border-box]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80">
          <div className="flex items-center gap-2 min-w-0">
            <Download className="w-5 h-5 text-primary shrink-0" />
            <span className="font-semibold truncate">{title}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative min-h-0 flex-1">
          <iframe
            src={url}
            title={title}
            className="h-full w-full bg-background"
            allow="downloads"
            onLoad={() => setShowFallback(true)}
          />
        </div>
        {fallbackUrl && (
          <div className="min-h-24 shrink-0 border-t border-border bg-background p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Download not started?</p>
              <Button asChild size="lg" className="w-full sm:w-auto" disabled={!showFallback}>
                <a
                  href={fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!showFallback}
                  className={!showFallback ? "pointer-events-none opacity-50" : undefined}
                >
                  <Download className="h-4 w-4" />
                  Download Anyway
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

