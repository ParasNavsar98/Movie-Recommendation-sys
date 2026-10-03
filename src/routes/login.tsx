import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/components/movieai/account-pages";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Log in — MOVIEAI" },
    { name: "description", content: "Explore the MOVIEAI login experience in a cinematic frontend preview." },
    { property: "og:title", content: "Log in — MOVIEAI" },
    { property: "og:description", content: "Explore the MOVIEAI login experience in a cinematic frontend preview." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: LoginPage,
});
