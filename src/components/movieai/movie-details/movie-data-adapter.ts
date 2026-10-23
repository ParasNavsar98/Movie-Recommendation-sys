import { catalogueMovies, type CatalogueMovie } from "@/data/catalogue-data";
import { movies as discoverMovies, type Movie as DiscoverMovie } from "../discover-data";
import trailerAsset from "@/assets/goodbye_web.webm";
import type {
  CastMember,
  CollectionItem,
  CrewMember,
  MovieDetail,
  MovieMeterData,
  RatingCategory,
  RatingCategoryMeta,
  UserReview,
  VibeItem,
} from "./types";

export const RATING_CATEGORIES: RatingCategoryMeta[] = [
  {
    id: "skip",
    label: "Skip",
    colorClass: "text-[#F43F5E]",
    bgClass: "bg-[#F43F5E]",
    hex: "#F43F5E",
    description: "Not worth your time. Major flaws or disappointing execution.",
  },
  {
    id: "timepass",
    label: "Timepass",
    colorClass: "text-[#F59E0B]",
    bgClass: "bg-[#F59E0B]",
    hex: "#F59E0B",
    description: "Decent for casual viewing. Entertaining but forgettable.",
  },
  {
    id: "goforit",
    label: "Go for it",
    colorClass: "text-[#10B981]",
    bgClass: "bg-[#10B981]",
    hex: "#10B981",
    description: "Highly recommended. Strong direction, performances, and story.",
  },
  {
    id: "perfection",
    label: "Perfection",
    colorClass: "text-[#8B5CF6]",
    bgClass: "bg-[#8B5CF6]",
    hex: "#8B5CF6",
    description: "An absolute cinematic masterpiece. Flawless in mood and craft.",
  },
];

export function formatRuntime(minutes: number | null): string {
  if (!minutes || minutes <= 0) return "Runtime N/A";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export function resolveMovieDetail(movieId: string): MovieDetail | null {
  const cleanId = String(movieId || "").trim();
  if (!cleanId) return null;

  // 1. Search catalogue
  const cat = catalogueMovies.find((m) => m.id === cleanId);
  if (cat) {
    const runtimeFormatted = formatRuntime(cat.runtime);
    const genres = [cat.genre || "Cinema"];

    const overview = `${cat.title} is a ${cat.genre} film directed by ${cat.director || "independent filmmakers"}${
      cat.year ? ` and released in ${cat.year}` : ""
    }${cat.studio ? ` by ${cat.studio}` : ""}.${
      cat.country ? ` Filmed and produced in ${cat.country},` : ""
    } this title is indexed in the verified MOVIEAI catalogue archives with an audience rating of ${
      cat.rating ? cat.rating.toFixed(1) : "unrated"
    }/10 across ${cat.voteCount ? cat.voteCount.toLocaleString() : "0"} recorded votes.`;

    return {
      id: cat.id,
      title: cat.title,
      year: cat.year,
      runtime: cat.runtime,
      runtimeFormatted,
      rating: cat.rating,
      voteCount: cat.voteCount || 0,
      popularity: cat.popularity || 0,
      genre: cat.genre || "Cinema",
      genres,
      director: cat.director || "Unknown Director",
      studio: cat.studio || null,
      country: cat.country || null,
      language: cat.language || "English",
      ageRating: cat.rating && cat.rating >= 7.5 ? "PG-13" : "U/A",
      posterUrl: cat.posterUrl,
      backdropUrl: cat.posterUrl,
      overview,
      budget: cat.budget,
      revenue: cat.revenue,
      trailerUrl: trailerAsset,
      hasPoster: cat.hasPoster,
    };
  }

  // 2. Search discover movies
  const disc = discoverMovies.find((m) => m.id === cleanId);
  if (disc) {
    const yearNum = parseInt(disc.year, 10) || null;
    return {
      id: disc.id,
      title: disc.title,
      year: yearNum,
      runtime: null,
      runtimeFormatted: disc.runtime,
      rating: disc.rating,
      voteCount: 1420,
      popularity: 88.5,
      genre: disc.genre,
      genres: [disc.genre, ...disc.tags],
      director: disc.director,
      studio: null,
      country: disc.country,
      language: disc.language,
      ageRating: disc.ageRating,
      posterUrl: disc.image,
      backdropUrl: disc.image,
      overview: disc.description,
      budget: null,
      revenue: null,
      trailerUrl: trailerAsset,
      hasPoster: true,
    };
  }

  return null;
}

export function getMovieCast(movieId: string): CastMember[] {
  // Check discover data for real configured cast
  const disc = discoverMovies.find((m) => m.id === movieId);
  if (disc && disc.cast && disc.cast.length > 0) {
    return disc.cast.map((name, idx) => ({
      id: `cast-${idx}`,
      name,
      character: `Cast Member ${idx + 1}`,
      avatarUrl: null,
    }));
  }

  // If catalogue movie, CSV does not contain cast. Return empty array to trigger honest unavailable state
  return [];
}

export function getMovieCrew(movie: MovieDetail): CrewMember[] {
  const crew: CrewMember[] = [];
  if (movie.director && movie.director !== "Unknown Director") {
    crew.push({
      id: "crew-dir",
      name: movie.director,
      role: "Director",
      avatarUrl: null,
    });
  }
  if (movie.studio) {
    crew.push({
      id: "crew-studio",
      name: movie.studio,
      role: "Production Studio",
      avatarUrl: null,
    });
  }
  return crew;
}

const VIBE_PALETTE = [
  "#C2410C", // Terracotta / Brown
  "#EF4444", // Red
  "#EAB308", // Yellow
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
];

export function getMovieVibe(movie: MovieDetail): VibeItem[] {
  // If discover movie has custom vibe
  const disc = discoverMovies.find((m) => m.id === movie.id);
  if (disc && disc.vibe && disc.vibe.length > 0) {
    return disc.vibe.map((v, i) => ({
      label: v.label,
      value: v.value,
      color: VIBE_PALETTE[i % VIBE_PALETTE.length],
    }));
  }

  // Deterministic genre-based vibe breakdown
  const g = movie.genre.toLowerCase();
  if (g.includes("action") || g.includes("adventure")) {
    return [
      { label: "High-Octane Action", value: 38, color: VIBE_PALETTE[0] },
      { label: "Tension & Threat", value: 24, color: VIBE_PALETTE[1] },
      { label: "Spectacle & Pace", value: 18, color: VIBE_PALETTE[2] },
      { label: "Atmospheric Scale", value: 12, color: VIBE_PALETTE[3] },
      { label: "Heroic Resolve", value: 8, color: VIBE_PALETTE[4] },
    ];
  } else if (g.includes("drama") || g.includes("romance")) {
    return [
      { label: "Emotional Depth", value: 36, color: VIBE_PALETTE[0] },
      { label: "Intimate Narrative", value: 26, color: VIBE_PALETTE[1] },
      { label: "Quiet Tension", value: 18, color: VIBE_PALETTE[2] },
      { label: "Character Study", value: 12, color: VIBE_PALETTE[3] },
      { label: "Poetic Melancholy", value: 8, color: VIBE_PALETTE[4] },
    ];
  } else if (g.includes("sci-fi") || g.includes("fantasy")) {
    return [
      { label: "Conceptual Wonder", value: 35, color: VIBE_PALETTE[0] },
      { label: "Futuristic Edge", value: 25, color: VIBE_PALETTE[1] },
      { label: "Visual Scope", value: 20, color: VIBE_PALETTE[2] },
      { label: "Philosophical Weight", value: 12, color: VIBE_PALETTE[3] },
      { label: "Cosmic Solitude", value: 8, color: VIBE_PALETTE[4] },
    ];
  } else if (g.includes("thriller") || g.includes("mystery") || g.includes("crime")) {
    return [
      { label: "Psychological Suspense", value: 38, color: VIBE_PALETTE[0] },
      { label: "Dark Intrigue", value: 24, color: VIBE_PALETTE[1] },
      { label: "Unsettling Mood", value: 18, color: VIBE_PALETTE[2] },
      { label: "Cold Realism", value: 12, color: VIBE_PALETTE[3] },
      { label: "Climactic Tension", value: 8, color: VIBE_PALETTE[4] },
    ];
  } else if (g.includes("comedy")) {
    return [
      { label: "Witty Dialogue", value: 36, color: VIBE_PALETTE[0] },
      { label: "Playful Dynamic", value: 26, color: VIBE_PALETTE[1] },
      { label: "Satirical Sharpness", value: 18, color: VIBE_PALETTE[2] },
      { label: "Feel-Good Energy", value: 12, color: VIBE_PALETTE[3] },
      { label: "Character Charm", value: 8, color: VIBE_PALETTE[4] },
    ];
  } else if (g.includes("animation")) {
    return [
      { label: "Vibrant Artistry", value: 36, color: VIBE_PALETTE[0] },
      { label: "Imaginative World", value: 26, color: VIBE_PALETTE[1] },
      { label: "Heartfelt Journey", value: 18, color: VIBE_PALETTE[2] },
      { label: "Dynamic Rhythm", value: 12, color: VIBE_PALETTE[3] },
      { label: "Universal Appeal", value: 8, color: VIBE_PALETTE[4] },
    ];
  }

  // Default balanced breakdown
  return [
    { label: "Narrative Drive", value: 34, color: VIBE_PALETTE[0] },
    { label: "Cinematic Atmosphere", value: 26, color: VIBE_PALETTE[1] },
    { label: "Thematic Richness", value: 18, color: VIBE_PALETTE[2] },
    { label: "Pacing & Rhythm", value: 14, color: VIBE_PALETTE[3] },
    { label: "Emotional Impact", value: 8, color: VIBE_PALETTE[4] },
  ];
}

export function getMovieMeterStats(movie: MovieDetail): MovieMeterData {
  const total = movie.voteCount;
  if (!total || total <= 0) {
    return {
      consensusPct: 0,
      positiveVotes: 0,
      totalVotes: 0,
      distribution: { skip: 0, timepass: 0, goforit: 0, perfection: 0 },
      voteCounts: { skip: 0, timepass: 0, goforit: 0, perfection: 0 },
    };
  }

  const score = movie.rating ?? 6.5;
  // Deterministic calculation based on actual rating
  let perfectionPct = 0;
  let goforitPct = 0;
  let timepassPct = 0;
  let skipPct = 0;

  if (score >= 8.0) {
    perfectionPct = Math.min(48, Math.round((score - 6.5) * 22));
    goforitPct = Math.min(50, Math.round(92 - perfectionPct));
    timepassPct = Math.max(4, Math.round((10 - score) * 3));
    skipPct = Math.max(2, 100 - perfectionPct - goforitPct - timepassPct);
  } else if (score >= 7.0) {
    perfectionPct = Math.round((score - 6.0) * 12);
    goforitPct = Math.round(48 + (score - 7.0) * 10);
    timepassPct = Math.round(22 - (score - 7.0) * 8);
    skipPct = Math.max(3, 100 - perfectionPct - goforitPct - timepassPct);
  } else if (score >= 5.5) {
    perfectionPct = Math.max(3, Math.round((score - 5.0) * 4));
    goforitPct = Math.round(26 + (score - 5.5) * 12);
    timepassPct = Math.round(42 - (score - 5.5) * 6);
    skipPct = Math.max(8, 100 - perfectionPct - goforitPct - timepassPct);
  } else {
    perfectionPct = 2;
    goforitPct = Math.max(8, Math.round(score * 3));
    timepassPct = Math.round(35 + score * 2);
    skipPct = Math.max(20, 100 - perfectionPct - goforitPct - timepassPct);
  }

  // Normalize to 100
  const sum = perfectionPct + goforitPct + timepassPct + skipPct;
  if (sum !== 100) {
    goforitPct += 100 - sum;
  }

  const positivePct = goforitPct + perfectionPct;
  const positiveVotes = Math.round(total * (positivePct / 100));

  const voteCounts: Record<RatingCategory, number> = {
    skip: Math.round(total * (skipPct / 100)),
    timepass: Math.round(total * (timepassPct / 100)),
    goforit: Math.round(total * (goforitPct / 100)),
    perfection: Math.round(total * (perfectionPct / 100)),
  };

  return {
    consensusPct: positivePct,
    positiveVotes,
    totalVotes: total,
    distribution: {
      skip: skipPct,
      timepass: timepassPct,
      goforit: goforitPct,
      perfection: perfectionPct,
    },
    voteCounts,
  };
}

export function getMovieCollections(movie: MovieDetail): CollectionItem[] {
  // Grab top movies from catalogue to populate thumbnails
  const sameGenre = catalogueMovies
    .filter((m) => m.genre === movie.genre && m.hasPoster && m.posterUrl)
    .slice(0, 4)
    .map((m) => m.posterUrl as string);

  const topHits = catalogueMovies
    .filter((m) => (m.rating ?? 0) >= 7.8 && m.hasPoster && m.posterUrl)
    .slice(0, 4)
    .map((m) => m.posterUrl as string);

  const directorMovies = catalogueMovies
    .filter((m) => m.director === movie.director && m.hasPoster && m.posterUrl)
    .slice(0, 4)
    .map((m) => m.posterUrl as string);

  const collections: CollectionItem[] = [
    {
      id: "col-genre",
      title: `The Best of ${movie.genre}`,
      itemCount: 28,
      likeCount: 342,
      posters: sameGenre.length >= 2 ? sameGenre : topHits,
    },
    {
      id: "col-director",
      title: `${movie.director}: Selected Filmography`,
      itemCount: Math.max(8, directorMovies.length * 2),
      likeCount: 189,
      posters: directorMovies.length >= 1 ? directorMovies : topHits,
    },
    {
      id: "col-decade",
      title: `${movie.year ? `${Math.floor(movie.year / 10) * 10}s` : "Modern"} Essential Cinema`,
      itemCount: 42,
      likeCount: 512,
      posters: topHits,
    },
  ];

  return collections;
}

export function getInitialReviews(movieId: string): UserReview[] {
  return [
    {
      id: "rev-1",
      author: "Elena Rostova",
      handle: "@cinemapath",
      avatar: "ER",
      date: "2 days ago",
      rating: "perfection",
      content:
        "Every single frame is calibrated with absolute intent. The pacing gives the narrative room to breathe without ever losing its gripping undercurrent. Highly recommend watching with premium audio.",
      likes: 142,
      replies: 14,
      following: true,
      userLiked: false,
    },
    {
      id: "rev-2",
      author: "Marcus Thorne",
      handle: "@thorne_film",
      avatar: "MT",
      date: "5 days ago",
      rating: "goforit",
      content:
        "Confident direction and memorable sequences. The third act has an unexpected tonal shift that completely recontextualises the earlier character motivations.",
      likes: 88,
      replies: 6,
      following: false,
      spoiler: true,
      userLiked: false,
    },
    {
      id: "rev-3",
      author: "Kavita Rao",
      handle: "@kavita_watches",
      avatar: "KR",
      date: "1 week ago",
      rating: "goforit",
      content:
        "Striking visual style and terrific ensemble energy. It does rely on a few familiar genre tropes midway through, but the climax more than delivers.",
      likes: 54,
      replies: 3,
      following: true,
      userLiked: false,
    },
    {
      id: "rev-4",
      author: "David Vance",
      handle: "@vance_reel",
      avatar: "DV",
      date: "2 weeks ago",
      rating: "timepass",
      content:
        "Great production values and cinematography. If you are looking for an entertaining weekend watch, this fits the bill nicely, though it doesn't take quite enough risks.",
      likes: 29,
      replies: 2,
      following: false,
      userLiked: false,
    },
  ];
}

export function getSimilarMovies(movie: MovieDetail, count = 12): CatalogueMovie[] {
  // Same genre first, exclude current movie
  const matches = catalogueMovies.filter(
    (m) => m.id !== movie.id && m.genre === movie.genre && m.hasPoster
  );

  // Sort by popularity and rating
  matches.sort((a, b) => (b.popularity || 0) * (b.rating || 1) - (a.popularity || 0) * (a.rating || 1));

  if (matches.length >= count) {
    return matches.slice(0, count);
  }

  // If not enough, fill with other top rated movies
  const others = catalogueMovies.filter(
    (m) => m.id !== movie.id && m.genre !== movie.genre && m.hasPoster
  );
  others.sort((a, b) => (b.popularity || 0) * (b.rating || 1) - (a.popularity || 0) * (a.rating || 1));

  return [...matches, ...others].slice(0, count);
}
