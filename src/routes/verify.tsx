import { createFileRoute } from "@tanstack/react-router";
import { VerifyPage } from "@/components/movieai/account-pages";

export const Route = createFileRoute("/verify")({
  head: () => ({ meta: [
    { title: "VerifyPage — MOVIEAI" },
    { name: "description", content: "Explore the MOVIEAI verify experience in a cinematic frontend preview." },
    { property: "og:title", content: "VerifyPage — MOVIEAI" },
    { property: "og:description", content: "Explore the MOVIEAI verify experience in a cinematic frontend preview." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: VerifyPage,
});
