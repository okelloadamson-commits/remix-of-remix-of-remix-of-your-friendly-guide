import { isPublicR2Source } from "./direct-download";

// Public R2 objects are already public; this adds attachment headers, not access protection.
export async function streamMediaDownload(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const source = params.get("source") || "";
  const filename = params.get("filename") || "video.mp4";
  if (source.length > 4096 || filename.length > 240 || !isPublicR2Source(source)) {
    return new Response("Invalid download", { status: 400 });
  }
  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);
  try {
    const upstream = await fetcher(source, { headers, redirect: "error", signal: request.signal });
    if (!upstream.ok) return new Response("Video unavailable", { status: upstream.status });
    const output = new Headers({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="video"; filename*=UTF-8''${encodeURIComponent(filename.replace(/[\r\n]/g, "")).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16)}`)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of ["Content-Length", "Content-Range", "Accept-Ranges", "ETag"]) {
      const value = upstream.headers.get(name);
      if (value) output.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: output });
  } catch {
    return new Response("Download unavailable. Please try again.", { status: 502 });
  }
}