import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/movieai/onboarding-pages";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [
    { title: "Your profile — MOVIEAI" },
    { name: "description", content: "Your MOVIEAI profile, favorite genres, favorites and watchlist." },
    { property: "og:title", content: "Your profile — MOVIEAI" },
    { property: "og:description", content: "Your MOVIEAI profile, favorite genres, favorites and watchlist." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ProfilePage,
});
