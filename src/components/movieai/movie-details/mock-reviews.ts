// Demo-only community data. Isolated so it can be replaced by real backend data later.
export type RatingCategory = "skip" | "timepass" | "goforit" | "perfection";

export const ratingCategories: { id: RatingCategory; label: string; colorClass: string; bgClass: string; stroke: string }[] = [
  { id: "skip", label: "Skip", colorClass: "text-rate-skip", bgClass: "bg-rate-skip", stroke: "var(--rate-skip)" },
  { id: "timepass", label: "Timepass", colorClass: "text-rate-timepass", bgClass: "bg-rate-timepass", stroke: "var(--rate-timepass)" },
  { id: "goforit", label: "Go for it", colorClass: "text-rate-goforit", bgClass: "bg-rate-goforit", stroke: "var(--rate-goforit)" },
  { id: "perfection", label: "Perfection", colorClass: "text-rate-perfection", bgClass: "bg-rate-perfection", stroke: "var(--rate-perfection)" },
];

export type Review = { id: string; user: string; date: string; rating: RatingCategory; body: string; likes: number; replies: number; spoiler?: boolean; following?: boolean };

/** Deterministic demo vote counts derived from the movie id. */
export function demoVotes(movieId: string): Record<RatingCategory, number> {
  const seed = [...movieId].reduce((a, c) => a + c.charCodeAt(0), 0);
  return { skip: 1 + (seed % 3), timepass: 6 + (seed % 7), goforit: 50 + (seed % 25), perfection: 30 + (seed % 20) };
}

export const demoReviews: Review[] = [
  { id: "r1", user: "nightowl_cinema", date: "2 days ago", rating: "perfection", likes: 214, replies: 18, following: true, body: "One of those rare films where every frame feels considered. The sound design alone deserves a second watch — I caught details I completely missed the first time. The final twenty minutes quietly rearrange everything you thought the story was about, and it never once tells you how to feel." },
  { id: "r2", user: "reel.marta", date: "5 days ago", rating: "goforit", likes: 96, replies: 7, body: "Beautifully shot and confidently paced. The middle act drifts a little, but the performances carry it." },
  { id: "r3", user: "framebyframe", date: "1 week ago", rating: "goforit", likes: 61, replies: 4, spoiler: true, following: true, body: "The reveal that the narrator was never actually there recontextualises the opening scene perfectly." },
  { id: "r4", user: "popcorn_theory", date: "2 weeks ago", rating: "timepass", likes: 23, replies: 2, body: "Gorgeous to look at, but I wanted the script to take more risks. Worth it for the visuals." },
  { id: "r5", user: "lena.watches", date: "3 weeks ago", rating: "skip", likes: 9, replies: 11, body: "Not for me — too slow and the ending felt unearned." },
];

export const demoMerch = { title: "Collector's Edition Steelbook + Art Card", meta: "4K UHD · Limited run · Demo listing" };
