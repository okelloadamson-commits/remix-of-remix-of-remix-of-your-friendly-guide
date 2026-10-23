import { usesDirectVideoPlayer } from "./upload-policy";

export function isPublicR2Source(source: string): boolean {
  try {
    const url = new URL(source);
    return url.protocol === "https:" && /^pub-[a-z0-9-]+\.r2\.dev$/.test(url.hostname)
      && !url.username && !url.password && !url.port;
  } catch {
    return false;
  }
}

export function getDirectDownloadUrl(source: string, filename: string): string | null {
  if (!usesDirectVideoPlayer(source)) return null;
  if (!isPublicR2Source(source)) return source;
  return `/api/public/media-download?${new URLSearchParams({ source, filename })}`;
}

export function startDirectVideoDownload(source: string, filename: string): void {
  const href = getDirectDownloadUrl(source, filename);
  if (!href) throw new Error("Invalid direct video URL");
  const anchor = document.createElement("a");
  anchor.href = href;
  // Same-origin R2 response supplies attachment headers; other hosts use the download hint.
  if (!href.startsWith("/api/public/media-download?")) anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}