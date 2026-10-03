import goodbyeVideo from "@/assets/goodbye_web.webm";
import fallbackImage from "@/assets/cinematic-hero.jpg";

export type MovieDoorData = {
  title: string;
  videoUrl: string;
  posterUrl: string;
  subtitle: string;
  tag: string;
};

export const defaultMovieDoorData: MovieDoorData = {
  title: "THE FINAL CUT",
  videoUrl: goodbyeVideo,
  posterUrl: fallbackImage,
  subtitle: "A HIDDEN CINEMATIC WORLD INSIDE MOVIEAI",
  tag: "CINEMATIC DOORWAY",
};
