import { createFileRoute } from "@tanstack/react-router";
import { ExplorePage } from "@/components/movieai/explore-page";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore Movies — MOVIEAI" },
      {
        name: "description",
        content:
          "Explore the complete searchable MOVIEAI movie catalogue with real posters, verified metadata, genre filtering, and watchlist controls.",
      },
      { property: "og:title", content: "Explore Movies — MOVIEAI" },
      {
        property: "og:description",
        content:
          "Complete searchable movie catalogue with real poster archives, genre collections, and personalized watchlists.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExplorePage,
});
