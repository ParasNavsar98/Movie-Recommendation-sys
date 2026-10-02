import { createFileRoute } from "@tanstack/react-router";
import { ResetPage } from "@/components/movieai/account-pages";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "ResetPage — MOVIEAI" },
    { name: "description", content: "Explore the MOVIEAI reset-password experience in a cinematic frontend preview." },
    { property: "og:title", content: "ResetPage — MOVIEAI" },
    { property: "og:description", content: "Explore the MOVIEAI reset-password experience in a cinematic frontend preview." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ResetPage,
});
