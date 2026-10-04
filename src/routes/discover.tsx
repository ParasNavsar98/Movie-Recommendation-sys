import { createFileRoute } from "@tanstack/react-router";
import { DiscoverPage } from "@/components/movieai/discover-page";

export const Route = createFileRoute("/discover")({
  head: () => ({ meta: [
    { title: "Discover movies — MOVIEAI" },
    { name: "description", content: "Search films, actors and directors, filter by genre, language, year and rating, and get recommendations shaped by your taste." },
    { property: "og:title", content: "Discover movies — MOVIEAI" },
    { property: "og:description", content: "Personalized movie discovery with trailers, ratings, favorites and watchlist." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: DiscoverPage,
});
