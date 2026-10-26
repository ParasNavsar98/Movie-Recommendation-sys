import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Compass,
  Film,
  Heart,
  Info,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  User,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMovieDemo, type Library as Lib } from "./demo-context";
import { movieAiApi, type RecommendationItem } from "@/lib/api-client";
import { catalogueMovies, type CatalogueMovie } from "@/data/catalogue-data";

const FALLBACK_POSTER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22450%22%20viewBox%3D%220%200%20300%20450%22%3E%3Crect%20fill%3D%22%23181818%22%20width%3D%22300%22%20height%3D%22450%22%2F%3E%3Ctext%20fill%3D%22%2371717A%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%3ENo%20Poster%3C%2Ftext%3E%3C%2Fsvg%3E";

// Canonical genre titles for section headers
const GENRE_LABELS: Record<string, { title: string; subtitle: string }> = {
  Action: {
    title: "Action for You",
    subtitle: "High-octane blockbusters and kinetic adventures matched to your taste.",
  },
  Adventure: {
    title: "Adventure Picks",
    subtitle: "Epic journeys, sprawling quests, and expeditions aligned with your profile.",
  },
  "Science Fiction": {
    title: "Science Fiction Discoveries",
    subtitle: "Speculative worlds, cosmic odysseys, and futuristic narratives.",
  },
  Thriller: {
    title: "Thrillers Based on Your Taste",
    subtitle: "Suspense, tension, and neo-noir mysteries tuned to your signals.",
  },
  Drama: {
    title: "Drama Selections",
    subtitle: "Character-driven storytelling and acclaimed emotional narratives.",
  },
  Comedy: {
    title: "Comedy for You",
    subtitle: "Witty screenplays, satire, and lighthearted crowd-pleasers.",
  },
  Crime: {
    title: "Crime & Underworld",
    subtitle: "Heists, noir, law enforcement, and crime dramas matching your history.",
  },
  Horror: {
    title: "Horror You Might Like",
    subtitle: "Psychological dread, supernatural mysteries, and dark thrillers.",
  },
  Romance: {
    title: "Romance & Connection",
    subtitle: "Love stories and poignant relationships selected for you.",
  },
  Mystery: {
    title: "Mystery & Enigma",
    subtitle: "Puzzle-box plots and investigative cinema.",
  },
  Animation: {
    title: "Animated Masterpieces",
    subtitle: "Visually stunning animated features for your viewing.",
  },
  Fantasy: {
    title: "Fantasy Worlds",
    subtitle: "Mythical realms and magical sagas picked for you.",
  },
};

export function ForYouPage() {
  const {
    name,
    email,
    library: lib,
    backendStatus,
    syncCounter,
    toggleLike,
    toggleDislike,
    toggleFavorite,
    toggleWatchlist,
    rateMovie,
    recordWatched,
    reset,
  } = useMovieDemo();
  const navigate = useNavigate();

  // State
  const [feedItems, setFeedItems] = useState<RecommendationItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<"profile" | "discovery">("profile");
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);

  // Interaction counts
  const likedCount = Object.values(lib.reactions).filter((r) => r === "like").length;
  const dislikedCount = Object.values(lib.reactions).filter((r) => r === "dislike").length;
  const ratingCount = Object.keys(lib.ratings).length;
  const favoriteCount = lib.favorites.length;
  const totalSignals = likedCount + dislikedCount + ratingCount + favoriteCount;
  const isColdStart = totalSignals === 0 || !!fallbackReason?.includes("no_user_history");

  // Fetch real personalized recommendations from FastAPI backend
  const fetchRecommendations = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(false);
    try {
      const response = await movieAiApi.fetchFeed({
        limit: 80,
        mode: feedMode,
        excludeWatched: true,
        excludeDisliked: true,
      });

      setFeedItems(response.results);
      setFallbackReason(response.fallback_reason || null);
    } catch (err) {
      console.warn("Failed to fetch For You feed:", err);
      setFeedError(true);

      // Fallback: populate with acclaimed items from catalogue if offline
      const topOffline = catalogueMovies
        .filter((m) => m.hasPoster && m.rating && m.rating >= 7.8)
        .slice(0, 30)
        .map((m) => ({
          Movie_ID: Number(m.id),
          Title: m.title,
          Release_Year: m.year,
          Genres: m.genre,
          Director: m.director,
          Vote_Average: m.rating,
          Poster_Web_Path: m.posterUrl,
          poster_path: null,
          Similarity_Score: 0.8,
          Score_Components: {},
          Ranking_Components: {},
          Recommendation_Reasons: ["Top rated across catalog (offline baseline)"],
        }));
      setFeedItems(topOffline);
    } finally {
      setFeedLoading(false);
    }
  }, [feedMode]);

  // Refetch recommendations whenever user interactions or mode changes
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations, syncCounter]);

  // Group recommendations into genre rows without duplicating movies across sections
  const genreSections = useMemo(() => {
    if (!feedItems.length) return [];

    // Track assigned movie IDs so a movie is never duplicated in multiple rows
    const assignedIds = new Set<number>();
    const buckets: Record<string, RecommendationItem[]> = {};

    // Standard genres to scan in priority order
    const priorityGenres = [
      "Action",
      "Science Fiction",
      "Adventure",
      "Thriller",
      "Drama",
      "Crime",
      "Horror",
      "Comedy",
      "Mystery",
      "Romance",
      "Fantasy",
      "Animation",
    ];

    // First pass: assign each movie to its primary matching prominent genre
    for (const rec of feedItems) {
      if (assignedIds.has(rec.Movie_ID)) continue;
      const movieGenres = (rec.Genres || "")
        .split("|")
        .map((g) => g.trim())
        .filter(Boolean);

      // Find the first matching priority genre
      const matchedGenre = priorityGenres.find((g) => movieGenres.includes(g));
      if (matchedGenre) {
        if (!buckets[matchedGenre]) buckets[matchedGenre] = [];
        buckets[matchedGenre].push(rec);
        assignedIds.add(rec.Movie_ID);
      }
    }

    // Convert buckets into ordered sections (only keep rows with >= 2 movies)
    const result: {
      genre: string;
      title: string;
      subtitle: string;
      movies: RecommendationItem[];
    }[] = [];

    for (const g of priorityGenres) {
      const items = buckets[g];
      if (items && items.length >= 2) {
        const meta = GENRE_LABELS[g] || {
          title: `${g} Picks`,
          subtitle: `Recommended ${g} titles aligned with your taste profile.`,
        };
        result.push({
          genre: g,
          title: meta.title,
          subtitle: meta.subtitle,
          movies: items,
        });
      }
    }

    // Add any unassigned movies to an "Other Discoveries" row if sufficient
    const unassigned = feedItems.filter((m) => !assignedIds.has(m.Movie_ID));
    if (unassigned.length >= 3) {
      result.push({
        genre: "Discoveries",
        title: "More for Your Taste",
        subtitle: "Diverse recommendations across cinematic categories.",
        movies: unassigned,
      });
    }

    return result;
  }, [feedItems]);

  const actions = {
    toggleLike: (id: string) => toggleLike(id),
    toggleDislike: (id: string) => toggleDislike(id),
    toggleFavorite: (id: string) => toggleFavorite(id),
    toggleWatchlist: (id: string) => toggleWatchlist(id),
    rateMovie: (id: string, n: number) => rateMovie(id, n),
    openDetails: (m: { id: string }) => {
      recordWatched(m.id);
      navigate({ to: "/movie/$movieId", params: { movieId: m.id } });
    },
  };

  return (
    <div className="explore-cinema min-h-screen bg-[#0B0B0B] text-[#FFFFFF] selection:bg-[#FF6B00] selection:text-white">
      {/* 1. SHARED STICKY NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-[#292929] bg-[#0B0B0B]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-8">
            <Link
              to="/discover"
              className="flex items-center gap-2 text-xl font-bold tracking-tight text-white transition-opacity hover:opacity-90"
              aria-label="MOVIEAI home"
            >
              <span className="h-3 w-3 rounded-none bg-[#FF6B00]" />
              <span>MOVIEAI</span>
              <span className="text-[#FF4500]">.</span>
            </Link>

            <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
              <Link
                to="/discover"
                className="technical flex items-center gap-1.5 font-semibold text-[#FF6B00]"
                aria-current="page"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B00]" />
                For You
              </Link>
              <Link
                to="/explore"
                className="technical text-[#A1A1AA] transition-colors hover:text-white"
              >
                Explore Catalogue
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Backend status indicator */}
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-mono ${
                backendStatus === "online"
                  ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                  : backendStatus === "checking"
                  ? "border-amber-500/30 bg-amber-950/30 text-amber-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  backendStatus === "online"
                    ? "bg-emerald-400 animate-pulse"
                    : backendStatus === "checking"
                    ? "bg-amber-400"
                    : "bg-zinc-500"
                }`}
              />
              <span>
                {backendStatus === "online"
                  ? "FastAPI Engine Active"
                  : backendStatus === "checking"
                  ? "Connecting..."
                  : "Local Mode"}
              </span>
            </div>

            {/* Profile Drawer Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProfilePanelOpen(true)}
              className="relative rounded-full border-[#292929] bg-[#181818] text-xs font-mono text-white hover:bg-[#222222]"
            >
              <User size={13} className="mr-1.5 text-[#FF6B00]" />
              <span>Taste Profile</span>
              {totalSignals > 0 && (
                <span className="ml-1.5 rounded-full bg-[#FF6B00] px-1.5 py-0.2 text-[10px] font-bold text-black">
                  {totalSignals}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* 2. FOR YOU HERO DASHBOARD HEADER */}
      <section className="relative overflow-hidden border-b border-[#292929] bg-gradient-to-b from-[#161618] via-[#0E0E10] to-[#0B0B0B] py-12 md:py-16">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-950/40 px-3 py-1 text-xs font-mono text-purple-300">
                <Sparkles size={12} className="text-purple-400 animate-pulse" />
                <span>
                  {isColdStart
                    ? "COLD-START DISCOVERY FEED"
                    : `PERSONALIZED TASTE PROFILE ACTIVE (${totalSignals} SIGNALS)`}
                </span>
              </div>

              <h1 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-white sm:text-5xl">
                For You<span className="text-[#FF6B00]">.</span>
              </h1>

              <p className="mt-3 text-sm text-zinc-300 sm:text-base leading-relaxed">
                {isColdStart ? (
                  <>
                    Recommendations currently rank proven catalog standouts across major genres. As
                    you like, rate, and favorite movies on the{" "}
                    <Link to="/explore" className="text-[#FF6B00] underline underline-offset-4 hover:text-[#FF4500]">
                      Explore page
                    </Link>
                    , this dashboard dynamically sharpens to reflect your specific cinematic DNA.
                  </>
                ) : (
                  <>
                    Curated recommendations organized by genre, dynamically calculated from your{" "}
                    <span className="font-semibold text-white">{likedCount} likes</span>,{" "}
                    <span className="font-semibold text-white">{favoriteCount} favorites</span>,{" "}
                    <span className="font-semibold text-white">{ratingCount} ratings</span>, and{" "}
                    <span className="font-semibold text-white">{dislikedCount} dislikes</span> via
                    our TF-IDF synopsis and director similarity engine.
                  </>
                )}
              </p>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Mode switch */}
              <div className="inline-flex rounded-full border border-[#292929] bg-[#141416] p-0.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setFeedMode("profile")}
                  className={`rounded-full px-3.5 py-1.5 transition-colors ${
                    feedMode === "profile"
                      ? "bg-purple-600 font-semibold text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Taste Match
                </button>
                <button
                  type="button"
                  onClick={() => setFeedMode("discovery")}
                  className={`rounded-full px-3.5 py-1.5 transition-colors ${
                    feedMode === "discovery"
                      ? "bg-purple-600 font-semibold text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Discovery
                </button>
              </div>

              {/* Refresh Feed */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRecommendations}
                disabled={feedLoading}
                className="h-9 rounded-full border-[#292929] bg-[#181818] text-xs font-mono text-zinc-200 hover:bg-[#222222] hover:text-white"
              >
                <RefreshCw size={13} className={`mr-1.5 ${feedLoading ? "animate-spin" : ""}`} />
                <span>Refresh Recommendations</span>
              </Button>

              {/* Browse Explore shortcut */}
              <Button
                asChild
                size="sm"
                className="h-9 rounded-full bg-[#FF6B00] text-xs font-semibold text-white hover:bg-[#FF4500]"
              >
                <Link to="/explore">
                  <Compass size={14} className="mr-1.5" />
                  <span>Explore Catalogue</span>
                </Link>
              </Button>

              {/* Reset Profile if active */}
              {totalSignals > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reset}
                  title="Reset your local and backend taste profile"
                  className="h-9 rounded-full border-zinc-800 bg-[#141416] text-xs text-zinc-400 hover:border-rose-500/50 hover:text-rose-400"
                >
                  <RotateCcw size={12} className="mr-1" />
                  <span>Reset Taste</span>
                </Button>
              )}
            </div>
          </div>

          {/* Cold-start prompt banner if user has no interactions */}
          {isColdStart && (
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Info size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-amber-200">
                    Ready to build your personal recommendation profile?
                  </h2>
                  <p className="text-xs text-amber-400/80">
                    Visit Explore to like or rate 3+ films. Your For You feed will re-rank instantly!
                  </p>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                className="rounded-full bg-amber-500 text-black font-semibold hover:bg-amber-400 flex-none"
              >
                <Link to="/explore">Start Exploring Films →</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* 3. CORE GENRE-WISE RECOMMENDATION ROWS */}
      <main className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10 py-10 space-y-12">
        {/* Error / Offline Alert */}
        {feedError && (
          <div className="rounded-2xl border border-zinc-800 bg-[#141416] p-6 text-center">
            <WifiOff className="mx-auto h-8 w-8 text-zinc-500" />
            <h2 className="mt-2 text-sm font-semibold text-zinc-200">
              FastAPI Engine Offline or Reconnecting
            </h2>
            <p className="mt-1 text-xs text-zinc-400 max-w-lg mx-auto">
              Showing catalog fallback recommendations. To activate live TF-IDF vector ranking, run:{" "}
              <code className="rounded bg-black px-1.5 py-0.5 text-zinc-300">
                uvicorn movieai.main:app --port 8000
              </code>{" "}
              or <code className="rounded bg-black px-1.5 py-0.5 text-zinc-300">.\start-services.ps1</code>.
            </p>
            <Button
              size="sm"
              onClick={fetchRecommendations}
              className="mt-4 rounded-full bg-purple-600 text-white hover:bg-purple-500 text-xs"
            >
              <RefreshCw size={12} className="mr-1.5" />
              Retry Connection
            </Button>
          </div>
        )}

        {/* Loading Skeletons */}
        {feedLoading && feedItems.length === 0 && (
          <div className="space-y-10">
            {[1, 2, 3].map((sectionIndex) => (
              <div key={sectionIndex} className="space-y-4">
                <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                <div className="flex gap-4 overflow-hidden">
                  {[1, 2, 3, 4, 5, 6].map((cardIndex) => (
                    <div
                      key={cardIndex}
                      className="w-[180px] sm:w-[200px] flex-none rounded-xl bg-[#141416] border border-[#292929] overflow-hidden animate-pulse"
                    >
                      <div className="aspect-[2/3] bg-zinc-800" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-zinc-800 rounded w-3/4" />
                        <div className="h-3 bg-zinc-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Genre Rows */}
        {!feedLoading && genreSections.length > 0 && (
          <div className="space-y-12">
            {genreSections.map((section) => (
              <GenreRowSection
                key={section.genre}
                section={section}
                lib={lib}
                actions={actions}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!feedLoading && !feedError && genreSections.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#292929] p-12 text-center">
            <Film className="mx-auto h-10 w-10 text-zinc-600" />
            <h2 className="mt-3 text-base font-semibold text-white">
              No matching recommendations right now
            </h2>
            <p className="mt-1 text-sm text-zinc-400 max-w-md mx-auto">
              All candidates may have been marked as watched or excluded. Try exploring new titles or
              resetting your filters.
            </p>
            <Button asChild size="sm" className="mt-5 rounded-full bg-[#FF6B00] text-white">
              <Link to="/explore">Explore Full Catalogue</Link>
            </Button>
          </div>
        )}
      </main>

      {/* 4. PROFILE SIDE DRAWER */}
      {profilePanelOpen && (
        <ForYouProfilePanel
          name={name}
          email={email}
          lib={lib}
          backendStatus={backendStatus}
          onReset={reset}
          onClose={() => setProfilePanelOpen(false)}
          onOpenMovie={(id) => actions.openDetails({ id })}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------
// HORIZONTALLY SCROLLABLE GENRE ROW SECTION
// ---------------------------------------------------------
function GenreRowSection({
  section,
  lib,
  actions,
}: {
  section: {
    genre: string;
    title: string;
    subtitle: string;
    movies: RecommendationItem[];
  };
  lib: Lib;
  actions: {
    toggleLike: (id: string) => void;
    toggleDislike: (id: string) => void;
    toggleFavorite: (id: string) => void;
    toggleWatchlist: (id: string) => void;
    rateMovie: (id: string, n: number) => void;
    openDetails: (m: { id: string }) => void;
  };
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    const distance = 480;
    rowRef.current.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  return (
    <section className="space-y-3">
      {/* Section Header */}
      <div className="flex items-end justify-between border-b border-[#222222] pb-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
            <span>{section.title}</span>
            <span className="text-xs font-mono font-normal text-purple-400 rounded-full border border-purple-500/30 bg-purple-950/30 px-2 py-0.5">
              {section.movies.length} {section.movies.length === 1 ? "film" : "films"}
            </span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">{section.subtitle}</p>
        </div>

        {/* Scroll Controls */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label={`Scroll ${section.title} left`}
            className="grid h-8 w-8 place-items-center rounded-full border border-[#292929] bg-[#141416] text-zinc-300 transition-colors hover:border-[#FF6B00] hover:text-white hover:bg-[#1E1E22]"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label={`Scroll ${section.title} right`}
            className="grid h-8 w-8 place-items-center rounded-full border border-[#292929] bg-[#141416] text-zinc-300 transition-colors hover:border-[#FF6B00] hover:text-white hover:bg-[#1E1E22]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={rowRef}
        tabIndex={0}
        aria-label={`${section.title} recommendations carousel`}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 rounded-xl"
      >
        {section.movies.map((movie) => (
          <div
            key={movie.Movie_ID}
            className="w-[170px] sm:w-[190px] md:w-[210px] flex-none"
          >
            <ForYouMovieCard rec={movie} lib={lib} actions={actions} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------
// FOR YOU MOVIE CARD COMPONENT
// ---------------------------------------------------------
function ForYouMovieCard({
  rec,
  lib,
  actions,
}: {
  rec: RecommendationItem;
  lib: Lib;
  actions: {
    toggleLike: (id: string) => void;
    toggleDislike: (id: string) => void;
    toggleFavorite: (id: string) => void;
    toggleWatchlist: (id: string) => void;
    openDetails: (m: { id: string }) => void;
  };
}) {
  const movieId = String(rec.Movie_ID);
  const isLiked = lib.reactions[movieId] === "like";
  const isDisliked = lib.reactions[movieId] === "dislike";
  const inFavorites = lib.favorites.includes(movieId);
  const inWatchlist = lib.watchlist.includes(movieId);

  const scorePct = Math.round(rec.Similarity_Score * 100);
  const primaryReason = rec.Recommendation_Reasons?.[0];
  const posterSrc = rec.Poster_Web_Path || rec.poster_path || FALLBACK_POSTER;

  return (
    <article className="group relative flex flex-col h-full rounded-xl bg-[#141416] border border-[#292929] transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-500/60 hover:shadow-xl hover:shadow-black/70 overflow-hidden">
      {/* Poster Image */}
      <div
        className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900 cursor-pointer"
        onClick={() => actions.openDetails({ id: movieId })}
      >
        <img
          src={posterSrc}
          alt={rec.Title}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_POSTER;
          }}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Match Score Badge */}
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/85 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-purple-300 backdrop-blur-md border border-purple-500/40">
          <Sparkles size={9} className="text-purple-400" />
          <span>{scorePct}% Match</span>
        </span>

        {/* Rating Badge */}
        {rec.Vote_Average !== null && rec.Vote_Average > 0 && (
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md border border-zinc-800">
            <Star size={10} className="fill-amber-400 text-amber-400" />
            <span>{rec.Vote_Average.toFixed(1)}</span>
          </span>
        )}

        {/* Quick actions hover overlay */}
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-lg bg-[#0B0B0B]/90 p-1 backdrop-blur-md border border-zinc-800 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            title={isLiked ? "Unlike" : "Like"}
            onClick={(e) => {
              e.stopPropagation();
              actions.toggleLike(movieId);
            }}
            className={`grid h-7 w-7 place-items-center rounded ${
              isLiked ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            <ThumbsUp size={13} className={isLiked ? "fill-white" : ""} />
          </button>

          <button
            type="button"
            title={isDisliked ? "Undislike" : "Dislike"}
            onClick={(e) => {
              e.stopPropagation();
              actions.toggleDislike(movieId);
            }}
            className={`grid h-7 w-7 place-items-center rounded ${
              isDisliked ? "bg-rose-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            <ThumbsDown size={13} className={isDisliked ? "fill-white" : ""} />
          </button>

          <button
            type="button"
            title={inFavorites ? "Remove Favorite" : "Favorite"}
            onClick={(e) => {
              e.stopPropagation();
              actions.toggleFavorite(movieId);
            }}
            className={`grid h-7 w-7 place-items-center rounded ${
              inFavorites ? "bg-rose-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Heart size={13} className={inFavorites ? "fill-white text-white" : ""} />
          </button>

          <button
            type="button"
            title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
            onClick={(e) => {
              e.stopPropagation();
              actions.toggleWatchlist(movieId);
            }}
            className={`grid h-7 w-7 place-items-center rounded ${
              inWatchlist ? "bg-[#FF6B00] text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Bookmark size={13} className={inWatchlist ? "fill-white" : ""} />
          </button>
        </div>
      </div>

      {/* Movie Info */}
      <div className="flex flex-1 flex-col p-3">
        <h3
          onClick={() => actions.openDetails({ id: movieId })}
          className="text-sm font-semibold text-white line-clamp-1 cursor-pointer transition-colors group-hover:text-purple-300"
          title={rec.Title}
        >
          {rec.Title}
        </h3>

        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#A1A1AA]">
          {rec.Release_Year && <span>{rec.Release_Year}</span>}
          {rec.Release_Year && rec.Genres && <span>•</span>}
          {rec.Genres && (
            <span className="line-clamp-1">{rec.Genres.split("|").slice(0, 2).join(", ")}</span>
          )}
        </div>

        {/* Evidence-based Reason Pill */}
        {primaryReason && (
          <div className="mt-2.5 rounded bg-purple-950/40 border border-purple-900/40 p-1.5 text-[10px] text-purple-300 line-clamp-2 leading-tight">
            {primaryReason}
          </div>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------
// FOR YOU PROFILE DRAWER COMPONENT
// ---------------------------------------------------------
function ForYouProfilePanel({
  name,
  email,
  lib,
  backendStatus,
  onReset,
  onClose,
  onOpenMovie,
}: {
  name: string;
  email: string;
  lib: Lib;
  backendStatus: string;
  onReset: () => void;
  onClose: () => void;
  onOpenMovie: (id: string) => void;
}) {
  const [tab, setTab] = useState<"watchlist" | "favorites" | "history">("watchlist");

  const lists = {
    watchlist: lib.watchlist,
    favorites: lib.favorites,
    history: lib.history,
  };

  const currentIds = lists[tab];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col border-l border-[#292929] bg-[#121212] p-6 overflow-y-auto"
        aria-label="Your Profile"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#FF6B00] text-white">
              <User size={22} />
            </span>
            <div>
              <p className="font-semibold text-white">{name || "Viewer"}</p>
              <p className="text-xs text-[#A1A1AA]">{email || "Local Demo Profile"}</p>
              <span className="technical text-[10px] text-purple-400">
                Engine: {backendStatus === "online" ? "Connected (SQLite Persistent)" : "Local Storage"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close profile panel"
            className="rounded-full p-2 text-[#A1A1AA] hover:bg-[#181818] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl border border-[#292929] bg-[#181818] p-2.5">
            <p className="text-lg font-bold text-emerald-400">
              {Object.values(lib.reactions).filter((r) => r === "like").length}
            </p>
            <p className="technical text-[9px] text-[#A1A1AA]">Likes</p>
          </div>
          <div className="rounded-xl border border-[#292929] bg-[#181818] p-2.5">
            <p className="text-lg font-bold text-white">{lib.watchlist.length}</p>
            <p className="technical text-[9px] text-[#A1A1AA]">Watchlist</p>
          </div>
          <div className="rounded-xl border border-[#292929] bg-[#181818] p-2.5">
            <p className="text-lg font-bold text-white">{lib.favorites.length}</p>
            <p className="technical text-[9px] text-[#A1A1AA]">Favorites</p>
          </div>
          <div className="rounded-xl border border-[#292929] bg-[#181818] p-2.5">
            <p className="text-lg font-bold text-white">{Object.keys(lib.ratings).length}</p>
            <p className="technical text-[9px] text-[#A1A1AA]">Rated</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex rounded-full border border-[#292929] bg-[#181818] p-1">
          {(["watchlist", "favorites", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`technical flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-xs transition-colors ${
                tab === t
                  ? "bg-[#FF6B00] text-white font-semibold"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              {t} ({lists[t].length})
            </button>
          ))}
        </div>

        {/* Movie list in tab */}
        <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
          {currentIds.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#A1A1AA]">No films in this collection.</p>
          ) : (
            currentIds.map((id) => {
              const movie = catalogueMovies.find((m) => m.id === id);
              if (!movie) return null;
              return (
                <div
                  key={id}
                  onClick={() => {
                    onOpenMovie(id);
                    onClose();
                  }}
                  className="flex items-center gap-3 rounded-lg border border-[#292929] bg-[#181818] p-2 cursor-pointer hover:border-[#FF6B00]/50"
                >
                  <img
                    src={movie.posterUrl || FALLBACK_POSTER}
                    alt={movie.title}
                    className="h-12 w-8 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{movie.title}</p>
                    <p className="text-[10px] text-[#A1A1AA]">{movie.year || "Year N/A"}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 border-t border-[#292929] pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="w-full rounded-full border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
          >
            <RotateCcw size={12} className="mr-1.5" />
            Reset All Interactions
          </Button>
        </div>
      </aside>
    </div>
  );
}
