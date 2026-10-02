import hero from "@/assets/cinematic-hero.jpg";
import desert from "@/assets/cinematic-desert.jpg";
import ocean from "@/assets/cinematic-ocean.jpg";
import city from "@/assets/cinematic-city.jpg";
import forest from "@/assets/cinematic-forest.jpg";
import train from "@/assets/cinematic-train.jpg";
import stairs from "@/assets/cinematic-stairs.jpg";
import space from "@/assets/cinematic-space.jpg";

export const onboardingFilms = [
  { id: "far-side", title: "The Far Side", year: "2026", genre: "Sci-Fi", rating: "8.7", image: hero },
  { id: "after-sun", title: "After the Sun", year: "2025", genre: "Adventure", rating: "8.4", image: desert },
  { id: "where-we-go", title: "Where We Go", year: "2024", genre: "Drama", rating: "8.9", image: ocean },
  { id: "night-signal", title: "Night Signal", year: "2025", genre: "Thriller", rating: "8.2", image: city },
  { id: "the-green", title: "The Green", year: "2023", genre: "Mystery", rating: "8.6", image: forest },
  { id: "northbound", title: "Northbound", year: "2022", genre: "Drama", rating: "8.1", image: train },
  { id: "blue-hour", title: "Blue Hour", year: "2024", genre: "Romance", rating: "8.5", image: stairs },
  { id: "elsewhere", title: "Elsewhere", year: "2026", genre: "Sci-Fi", rating: "9.1", image: space },
];

export const genreChoices = ["Sci-Fi", "Thriller", "Action", "Drama", "Comedy", "Horror", "Romance", "Adventure", "Animation", "Mystery"];
