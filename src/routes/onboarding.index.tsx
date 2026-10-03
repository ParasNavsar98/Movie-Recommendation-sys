import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "@/components/movieai/onboarding-pages";

export const Route = createFileRoute("/onboarding/")({
  head: () => ({ meta: [
    { title: "Pick films you love — MOVIEAI" },
    { name: "description", content: "Choose at least five favorite films to shape your MOVIEAI taste profile." },
    { property: "og:title", content: "Pick films you love — MOVIEAI" },
    { property: "og:description", content: "Choose at least five favorite films to shape your MOVIEAI taste profile." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: OnboardingPage,
});
