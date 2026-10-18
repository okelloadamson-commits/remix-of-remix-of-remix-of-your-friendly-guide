import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { isDownloadFrameBlank } from "@/lib/download-frame-state";

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
  onClose,
}: DownloadFrameDialogProps) {
  const closeRef = useRef(onClose);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [blankUrl, setBlankUrl] = useState<string | null>(null);

  const checkFrame = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    try {
      setBlankUrl(isDownloadFrameBlank(frame.contentDocument, frame.getAttribute("src") || "") ? frame.getAttribute("src") : null);
    } catch {
      // Drive controls its own document; unreadable does not mean blank.
      setBlankUrl(null);
    }
  }, []);

  useEffect(() => {
    setBlankUrl(null);
    if (!open) return;
    const timer = window.setInterval(checkFrame, 750);
    return () => window.clearInterval(timer);
  }, [open, url, checkFrame]);

  // Parent player updates must not reload the embedded confirmation page.
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
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
            ref={frameRef}
            src={url}
            title={title}
            className="h-full w-full bg-background"
            allow="downloads"
            onLoad={checkFrame}
          />
          {blankUrl === url && fallbackUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <Button asChild>
                <a href={fallbackUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                  Download Anyway
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

