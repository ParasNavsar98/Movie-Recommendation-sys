import goodbyeVideo from "@/assets/goodbye_web.webm";
import fallbackImage from "@/assets/cinematic-hero.jpg";

export type FilmCinematicData = {
  title: string;
  videoUrl: string;
  posterUrl: string;
  tag: string;
};

export const defaultFilmCinematicData: FilmCinematicData = {
  title: "CINEMATIC FILM",
  videoUrl: goodbyeVideo,
  posterUrl: fallbackImage,
  tag: "FILM",
};
