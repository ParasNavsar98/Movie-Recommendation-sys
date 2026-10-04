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
  runtime: string; director: string; cast: string[]; description: string; image: string;
};

export const movies: Movie[] = [
  { id: "far-side", title: "The Far Side", year: 2026, genre: "Sci-Fi", language: "English", rating: 8.7, runtime: "2h 18m", director: "Mara Okafor", cast: ["Idris Vance", "Lena Hartmann", "Theo Marsh"], description: "When an eclipse refuses to end, a lighthouse keeper becomes the last link between two worlds drifting apart.", image: hero },
  { id: "after-sun", title: "After the Sun", year: 2025, genre: "Adventure", language: "French", rating: 8.4, runtime: "2h 02m", director: "Julien Arcand", cast: ["Camille Roux", "Omar Sefiane"], description: "Two estranged siblings cross the Sahara to scatter their father's ashes, and find the map he left was never about the desert.", image: desert },
  { id: "where-we-go", title: "Where We Go", year: 2024, genre: "Drama", language: "English", rating: 8.9, runtime: "1h 54m", director: "Hana Lindqvist", cast: ["Ava Morrow", "Callum Reid"], description: "A storm-bound island, one ferry left, and a woman deciding whether she is leaving or finally arriving.", image: ocean },
  { id: "night-signal", title: "Night Signal", year: 2025, genre: "Thriller", language: "Japanese", rating: 8.2, runtime: "2h 07m", director: "Kenji Arata", cast: ["Rin Takeda", "Sho Mori"], description: "A radio engineer intercepts a broadcast predicting crimes in Tokyo, one hour before they happen.", image: city },
  { id: "the-green", title: "The Green", year: 2023, genre: "Mystery", language: "English", rating: 8.6, runtime: "1h 49m", director: "Mara Okafor", cast: ["Lena Hartmann", "Jonah Pike"], description: "A botanist mapping an ancient forest discovers the trees are rearranging themselves around her.", image: forest },
  { id: "northbound", title: "Northbound", year: 2022, genre: "Drama", language: "French", rating: 8.1, runtime: "2h 11m", director: "Julien Arcand", cast: ["Camille Roux", "Pierre Dagan"], description: "Thirty-six hours on a night train north, and a stranger who knows too much about her past.", image: train },
  { id: "blue-hour", title: "Blue Hour", year: 2024, genre: "Romance", language: "Japanese", rating: 8.5, runtime: "1h 58m", director: "Yui Hasegawa", cast: ["Mei Sato", "Daniel Arce"], description: "Every evening at the same seaside stairway, two people meet for exactly one hour, and never ask why.", image: stairs },
  { id: "elsewhere", title: "Elsewhere", year: 2026, genre: "Sci-Fi", language: "English", rating: 9.1, runtime: "2h 26m", director: "Hana Lindqvist", cast: ["Idris Vance", "Ava Morrow"], description: "The first astronaut to land on a ringed world finds footprints that are already hers.", image: space },
];

export const genres = ["All", ...Array.from(new Set(movies.map((m) => m.genre)))];
export const languages = ["All", "English", "French", "Japanese"];
export const years = ["All", "2026", "2025", "2024", "2023", "2022"];
export const ratingSteps = [0, 8, 8.5, 9];
