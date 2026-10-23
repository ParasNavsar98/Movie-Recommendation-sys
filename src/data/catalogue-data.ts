import rawCatalogue from "./movies-catalogue.json";

export interface CatalogueMovie {
  id: string;
  title: string;
  year: number | null;
  rating: number | null;
  voteCount: number;
  popularity: number;
  genre: string;
  director: string;
  runtime: number | null;
  language: string;
  posterUrl: string | null;
  hasPoster: boolean;
  budget: number | null;
  revenue: number | null;
  country: string | null;
  studio: string | null;
}

export const catalogueMovies: CatalogueMovie[] = rawCatalogue as CatalogueMovie[];

// Calculate genres and their actual counts
const genreCounts = new Map<string, number>();
for (const m of catalogueMovies) {
  const g = m.genre || "Unknown";
  genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
}

// Sorted genres by count, but with 'All Movies' first
export const genreOptions: { name: string; count: number }[] = [
  { name: "All Movies", count: catalogueMovies.length },
  ...Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count })),
];

// Available decades for year filtering
export const decadeOptions = [
  { label: "All Years", value: "all" },
  { label: "2020s", value: "2020s" },
  { label: "2010s", value: "2010s" },
  { label: "2000s", value: "2000s" },
  { label: "1990s", value: "1990s" },
  { label: "1980s", value: "1980s" },
  { label: "1970s", value: "1970s" },
  { label: "Classic (<1970)", value: "classic" },
];

// Rating filters
export const ratingOptions = [
  { label: "Any Rating", value: "0" },
  { label: "8.0+ Exceptional", value: "8" },
  { label: "7.0+ Recommended", value: "7" },
  { label: "6.0+ Good", value: "6" },
  { label: "5.0+ Average", value: "5" },
];

// Sort options
export type SortOption = "popularity_desc" | "rating_desc" | "year_desc" | "year_asc" | "title_asc";

export const sortOptions: { label: string; value: SortOption }[] = [
  { label: "Popularity: Highest first", value: "popularity_desc" },
  { label: "Rating: Highest first", value: "rating_desc" },
  { label: "Release year: Newest first", value: "year_desc" },
  { label: "Release year: Oldest first", value: "year_asc" },
  { label: "Title: A–Z", value: "title_asc" },
];

export function matchesDecade(year: number | null, decade: string): boolean {
  if (decade === "all") return true;
  if (!year) return false;
  if (decade === "2020s") return year >= 2020 && year <= 2029;
  if (decade === "2010s") return year >= 2010 && year <= 2019;
  if (decade === "2000s") return year >= 2000 && year <= 2009;
  if (decade === "1990s") return year >= 1990 && year <= 1999;
  if (decade === "1980s") return year >= 1980 && year <= 1989;
  if (decade === "1970s") return year >= 1970 && year <= 1979;
  if (decade === "classic") return year < 1970;
  return true;
}
