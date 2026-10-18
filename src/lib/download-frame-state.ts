export interface DownloadFrameDocument {
  readyState: string;
  URL: string;
  body: { textContent: string | null; querySelector: (selector: string) => unknown } | null;
}

// A cross-origin document is unreadable, not evidence of a blank page.
export function isDownloadFrameBlank(document: DownloadFrameDocument | null, requestedUrl: string): boolean {
  if (!document || document.readyState !== "complete" || !document.body) return false;
  if (document.URL === "about:blank" && requestedUrl !== "about:blank") return false;
  const hasText = Boolean(document.body.textContent?.trim());
  const hasContent = Boolean(document.body.querySelector("img, svg, video, audio, canvas, iframe, object, embed, input, button, a[href], [role='button']"));
  return !hasText && !hasContent;
}