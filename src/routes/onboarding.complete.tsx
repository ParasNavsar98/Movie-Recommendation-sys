import { createFileRoute } from "@tanstack/react-router";
import { CompletePage } from "@/components/movieai/onboarding-pages";

export const Route = createFileRoute("/onboarding/complete")({
  head: () => ({ meta: [
    { title: "Your taste profile — MOVIEAI" },
    { name: "description", content: "Watch MOVIEAI build your taste profile and first recommendations." },
    { property: "og:title", content: "Your taste profile — MOVIEAI" },
    { property: "og:description", content: "Watch MOVIEAI build your taste profile and first recommendations." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CompletePage,
});
