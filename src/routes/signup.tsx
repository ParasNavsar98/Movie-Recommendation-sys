import { createFileRoute } from "@tanstack/react-router";
import { SignupPage } from "@/components/movieai/account-pages";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [
    { title: "SignupPage — MOVIEAI" },
    { name: "description", content: "Explore the MOVIEAI signup experience in a cinematic frontend preview." },
    { property: "og:title", content: "SignupPage — MOVIEAI" },
    { property: "og:description", content: "Explore the MOVIEAI signup experience in a cinematic frontend preview." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SignupPage,
});
