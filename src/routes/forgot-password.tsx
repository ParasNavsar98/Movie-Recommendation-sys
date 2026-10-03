import { createFileRoute } from "@tanstack/react-router";
import { ForgotPage } from "@/components/movieai/account-pages";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [
    { title: "Forgot password — MOVIEAI" },
    { name: "description", content: "Explore the MOVIEAI forgot-password experience in a cinematic frontend preview." },
    { property: "og:title", content: "Forgot password — MOVIEAI" },
    { property: "og:description", content: "Explore the MOVIEAI forgot-password experience in a cinematic frontend preview." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ForgotPage,
});
