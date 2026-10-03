import { createFileRoute } from "@tanstack/react-router";
import { GenresPage } from "@/components/movieai/onboarding-pages";

export const Route = createFileRoute("/onboarding/genres")({
  head: () => ({ meta: [
    { title: "Your favorite genres — MOVIEAI" },
    { name: "description", content: "Optionally tell MOVIEAI which genres you usually enjoy." },
    { property: "og:title", content: "Your favorite genres — MOVIEAI" },
    { property: "og:description", content: "Optionally tell MOVIEAI which genres you usually enjoy." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: GenresPage,
});
