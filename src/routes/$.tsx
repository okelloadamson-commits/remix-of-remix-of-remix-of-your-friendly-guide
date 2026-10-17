import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/$")({
  head: () => ({ meta: [
    { title: "Luo Ancient Movies | Member and Admin Pages" },
    { name: "description", content: "Explore Luo Ancient content, member subscriptions and administration." },
    { property: "og:title", content: "Luo Ancient Movies | Member and Admin Pages" },
    { property: "og:description", content: "Explore Luo Ancient content, member subscriptions and administration." },
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
