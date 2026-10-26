import { createFileRoute } from "@tanstack/react-router";
import { ForYouPage } from "@/components/movieai/for-you-page";

export const Route = createFileRoute("/for-you")({
  head: () => ({
    meta: [
      { title: "For You — MOVIEAI | Personalized Movie Recommendations" },
      {
        name: "description",
        content:
          "Genre-wise personalized movie recommendations shaped dynamically by your likes, ratings, and favorites.",
      },
      { property: "og:title", content: "For You — MOVIEAI" },
      {
        property: "og:description",
        content:
          "Personalized recommendations organized by genre, powered by the content-based TF-IDF recommendation engine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForYouPage,
});
