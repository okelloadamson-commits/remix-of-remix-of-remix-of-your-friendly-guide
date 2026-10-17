import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Luo Ancient Movies | Movies and TV Series" },
    { name: "description", content: "Watch Luo Ancient movies and TV series and manage your subscription." },
    { property: "og:title", content: "Luo Ancient Movies | Movies and TV Series" },
    { property: "og:description", content: "Watch Luo Ancient movies and TV series and manage your subscription." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Page,
});

function Page() {
  return (
    <ClientOnly fallback={<div style={{ minHeight: "100vh", background: "hsl(240 10% 4%)" }} />}>
      <App />
    </ClientOnly>
  );
}
