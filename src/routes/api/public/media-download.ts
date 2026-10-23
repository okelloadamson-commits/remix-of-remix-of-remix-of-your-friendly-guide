import { createFileRoute } from "@tanstack/react-router";
import { streamMediaDownload } from "@/lib/direct-download.server";

export const Route = createFileRoute("/api/public/media-download")({
  server: { handlers: { GET: ({ request }) => streamMediaDownload(request) } },
});