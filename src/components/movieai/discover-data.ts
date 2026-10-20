import hero from "@/assets/cinematic-hero.jpg";
import desert from "@/assets/cinematic-desert.jpg";
import ocean from "@/assets/cinematic-ocean.jpg";
import city from "@/assets/cinematic-city.jpg";
import forest from "@/assets/cinematic-forest.jpg";
import train from "@/assets/cinematic-train.jpg";
import stairs from "@/assets/cinematic-stairs.jpg";
import space from "@/assets/cinematic-space.jpg";

export type Movie = {
  id: string; title: string; year: number; genre: string; language: string; rating: number;
  runtime: string; director: string; directorRoles: string; country: string; ageRating: string; tags: string[]; vibe: { label: string; value: number }[]; cast: string[]; description: string; image: string;
};

export const movies: Movie[] = [
  { id: "far-side", directorRoles: "Writer · Director", country: "United Kingdom", ageRating: "13+", tags: ["Space Odyssey","Cosmic Mystery","Lighthouse","Isolation"], vibe: [{ label: "Sci-Fi", value: 45 },{ label: "Drama", value: 30 },{ label: "Mystery", value: 25 }], title: "The Far Side", year: 2026, genre: "Sci-Fi", language: "English", rating: 8.7, runtime: "2h 18m", director: "Mara Okafor", cast: ["Idris Vance", "Lena Hartmann", "Theo Marsh"], description: "When an eclipse refuses to end, a lighthouse keeper becomes the last link between two worlds drifting apart.", image: hero },
  { id: "after-sun", directorRoles: "Director", country: "France", ageRating: "PG", tags: ["Road Trip","Siblings","Desert","Grief"], vibe: [{ label: "Adventure", value: 50 },{ label: "Drama", value: 40 },{ label: "Comedy", value: 10 }], title: "After the Sun", year: 2025, genre: "Adventure", language: "French", rating: 8.4, runtime: "2h 02m", director: "Julien Arcand", cast: ["Camille Roux", "Omar Sefiane"], description: "Two estranged siblings cross the Sahara to scatter their father's ashes, and find the map he left was never about the desert.", image: desert },
  { id: "where-we-go", directorRoles: "Writer · Director", country: "Sweden", ageRating: "13+", tags: ["Island Life","Coming Home","Character Study"], vibe: [{ label: "Drama", value: 60 },{ label: "Romance", value: 25 },{ label: "Thriller", value: 15 }], title: "Where We Go", year: 2024, genre: "Drama", language: "English", rating: 8.9, runtime: "1h 54m", director: "Hana Lindqvist", cast: ["Ava Morrow", "Callum Reid"], description: "A storm-bound island, one ferry left, and a woman deciding whether she is leaving or finally arriving.", image: ocean },
  { id: "night-signal", directorRoles: "Writer · Director", country: "Japan", ageRating: "16+", tags: ["Neo-Noir","Radio","Tokyo Nights","Time Paradox"], vibe: [{ label: "Thriller", value: 55 },{ label: "Sci-Fi", value: 25 },{ label: "Drama", value: 20 }], title: "Night Signal", year: 2025, genre: "Thriller", language: "Japanese", rating: 8.2, runtime: "2h 07m", director: "Kenji Arata", cast: ["Rin Takeda", "Sho Mori"], description: "A radio engineer intercepts a broadcast predicting crimes in Tokyo, one hour before they happen.", image: city },
  { id: "the-green", directorRoles: "Director", country: "Ireland", ageRating: "13+", tags: ["Folk Horror","Botany","Ancient Forest"], vibe: [{ label: "Mystery", value: 50 },{ label: "Horror", value: 30 },{ label: "Drama", value: 20 }], title: "The Green", year: 2023, genre: "Mystery", language: "English", rating: 8.6, runtime: "1h 49m", director: "Mara Okafor", cast: ["Lena Hartmann", "Jonah Pike"], description: "A botanist mapping an ancient forest discovers the trees are rearranging themselves around her.", image: forest },
  { id: "northbound", directorRoles: "Writer · Director", country: "France", ageRating: "16+", tags: ["Train Journey","Strangers","Secrets"], vibe: [{ label: "Drama", value: 55 },{ label: "Thriller", value: 35 },{ label: "Romance", value: 10 }], title: "Northbound", year: 2022, genre: "Drama", language: "French", rating: 8.1, runtime: "2h 11m", director: "Julien Arcand", cast: ["Camille Roux", "Pierre Dagan"], description: "Thirty-six hours on a night train north, and a stranger who knows too much about her past.", image: train },
  { id: "blue-hour", directorRoles: "Writer · Director", country: "Japan", ageRating: "PG", tags: ["Seaside","Slow Romance","Family Friendly"], vibe: [{ label: "Romance", value: 60 },{ label: "Drama", value: 30 },{ label: "Comedy", value: 10 }], title: "Blue Hour", year: 2024, genre: "Romance", language: "Japanese", rating: 8.5, runtime: "1h 58m", director: "Yui Hasegawa", cast: ["Mei Sato", "Daniel Arce"], description: "Every evening at the same seaside stairway, two people meet for exactly one hour, and never ask why.", image: stairs },
  { id: "elsewhere", directorRoles: "Writer · Director", country: "Sweden", ageRating: "13+", tags: ["Space Exploration","Time Loop","Ringed Planet"], vibe: [{ label: "Sci-Fi", value: 55 },{ label: "Mystery", value: 30 },{ label: "Drama", value: 15 }], title: "Elsewhere", year: 2026, genre: "Sci-Fi", language: "English", rating: 9.1, runtime: "2h 26m", director: "Hana Lindqvist", cast: ["Idris Vance", "Ava Morrow"], description: "The first astronaut to land on a ringed world finds footprints that are already hers.", image: space },
];

export const genres = ["All", ...Array.from(new Set(movies.map((m) => m.genre)))];
export const languages = ["All", "English", "French", "Japanese"];
export const years = ["All", "2026", "2025", "2024", "2023", "2022"];
export const ratingSteps = [0, 8, 8.5, 9];
