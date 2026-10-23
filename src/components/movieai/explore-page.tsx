import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Clock,
  DollarSign,
  Film,
  Globe,
  Heart,
  History,
  Menu,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import trailerVideo from "@/assets/goodbye_web.webm";
import { useMovieDemo, type Library as Lib } from "./demo-context";
import {
  catalogueMovies,
  decadeOptions,
  genreOptions,
  matchesDecade,
  ratingOptions,
  sortOptions,
  type CatalogueMovie,
  type SortOption,
} from "@/data/catalogue-data";

const PAGE_SIZE = 36;
const FALLBACK_POSTER = "/poster-fallback.svg";

const toggleIn = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export function ExplorePage() {
  const { name, email, library: lib, setLibrary: setLib } = useMovieDemo();
  const navigate = useNavigate();

  // Search & Filter state
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All Movies");
  const [selectedDecade, setSelectedDecade] = useState("all");
  const [selectedRating, setSelectedRating] = useState("0");
  const [selectedSort, setSelectedSort] = useState<SortOption>("popularity_desc");

  // Pagination state
  const [page, setPage] = useState(1);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // UI state
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<CatalogueMovie | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle scroll-to-top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Filter & Sort movies across entire dataset
  const filteredMovies = useMemo(() => {
    const q = query.trim().toLowerCase();
    const minRating = parseFloat(selectedRating) || 0;

    return catalogueMovies.filter((m) => {
      // 1. Text Search across Title, Director, Genre, Studio, Country, Language
      if (q) {
        const titleMatch = m.title.toLowerCase().includes(q);
        const directorMatch = m.director?.toLowerCase().includes(q);
        const genreMatch = m.genre?.toLowerCase().includes(q);
        const yearMatch = m.year ? String(m.year).includes(q) : false;
        const studioMatch = m.studio?.toLowerCase().includes(q);
        const countryMatch = m.country?.toLowerCase().includes(q);
        if (
          !titleMatch &&
          !directorMatch &&
          !genreMatch &&
          !yearMatch &&
          !studioMatch &&
          !countryMatch
        ) {
          return false;
        }
      }

      // 2. Genre Filter
      if (selectedGenre !== "All Movies") {
        if (m.genre !== selectedGenre) return false;
      }

      // 3. Decade / Year Filter
      if (selectedDecade !== "all") {
        if (!matchesDecade(m.year, selectedDecade)) return false;
      }

      // 4. Rating Filter
      if (minRating > 0) {
        if (m.rating === null || m.rating < minRating) return false;
      }

      return true;
    });
  }, [query, selectedGenre, selectedDecade, selectedRating]);

  // Sort filtered results
  const sortedMovies = useMemo(() => {
    const list = [...filteredMovies];

    switch (selectedSort) {
      case "popularity_desc":
        return list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

      case "rating_desc":
        return list.sort((a, b) => {
          // Handle missing ratings without placing them at the top
          if (a.rating === null && b.rating === null) return 0;
          if (a.rating === null) return 1;
          if (b.rating === null) return -1;
          return b.rating - a.rating || (b.voteCount || 0) - (a.voteCount || 0);
        });

      case "year_desc":
        return list.sort((a, b) => {
          if (a.year === null && b.year === null) return 0;
          if (a.year === null) return 1;
          if (b.year === null) return -1;
          return b.year - a.year;
        });

      case "year_asc":
        return list.sort((a, b) => {
          if (a.year === null && b.year === null) return 0;
          if (a.year === null) return 1;
          if (b.year === null) return -1;
          return a.year - b.year;
        });

      case "title_asc":
        return list.sort((a, b) => a.title.localeCompare(b.title));

      default:
        return list;
    }
  }, [filteredMovies, selectedSort]);

  // Total pages
  const totalPages = Math.ceil(sortedMovies.length / PAGE_SIZE) || 1;

  // Reset pagination when filters, search, or sort change
  useEffect(() => {
    setPage(1);
    setVisibleCount(PAGE_SIZE);
  }, [query, selectedGenre, selectedDecade, selectedRating, selectedSort]);

  // Movies to display currently
  const displayedMovies = useMemo(() => {
    return sortedMovies.slice(0, visibleCount);
  }, [sortedMovies, visibleCount]);

  // Actions connecting to existing demo context
  const actions = {
    toggleWatchlist: (id: string) => {
      setLib((l) => ({ ...l, watchlist: toggleIn(l.watchlist, id) }));
    },
    toggleFavorite: (id: string) => {
      setLib((l) => ({ ...l, favorites: toggleIn(l.favorites, id) }));
    },
    rate: (id: string, stars: number) => {
      setLib((l) => ({ ...l, ratings: { ...l.ratings, [id]: stars } }));
    },
    openDetails: (m: CatalogueMovie) => {
      setLib((l) => ({
        ...l,
        history: [m.id, ...l.history.filter((x) => x !== m.id)],
      }));
      navigate({ to: "/movie/$movieId", params: { movieId: m.id } });
    },
  };

  const hasActiveFilters =
    query.trim() !== "" ||
    selectedGenre !== "All Movies" ||
    selectedDecade !== "all" ||
    selectedRating !== "0" ||
    selectedSort !== "popularity_desc";

  const clearAllFilters = () => {
    setQuery("");
    setSelectedGenre("All Movies");
    setSelectedDecade("all");
    setSelectedRating("0");
    setSelectedSort("popularity_desc");
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sortedMovies.length));
  };

  const scrollToGridTop = () => {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="explore-cinema min-h-screen bg-[#0B0B0B] text-[#FFFFFF] selection:bg-[#FF6B00] selection:text-white">
      {/* SHARED NAVBAR */}
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
                className="technical text-[#A1A1AA] transition-colors hover:text-white"
              >
                For You
              </Link>
              <Link
                to="/explore"
                className="technical flex items-center gap-1.5 font-semibold text-[#FF6B00]"
                aria-current="page"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B00]" />
                Explore
              </Link>
              <a
                href="#genres"
                className="technical text-[#A1A1AA] transition-colors hover:text-white"
              >
                Genres
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {!name && (
              <Link
                to="/login"
                className="technical hidden px-3 text-[#A1A1AA] transition-colors hover:text-white sm:block"
              >
                Log in
              </Link>
            )}
            {!name && (
              <Button
                asChild
                size="sm"
                className="hidden rounded-full bg-[#FF6B00] font-mono text-[10px] uppercase text-white hover:bg-[#FF4500] sm:inline-flex"
              >
                <Link to="/signup">Register</Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPanelOpen(true)}
              aria-label="Open profile panel"
              className="rounded-full border border-[#292929] bg-[#121212] text-[#A1A1AA] hover:bg-[#181818] hover:text-white"
            >
              <User size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden border border-[#292929] text-[#A1A1AA] hover:text-white"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {menuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="flex flex-col border-t border-[#292929] bg-[#121212] px-6 py-4 md:hidden"
          >
            <Link
              to="/discover"
              onClick={() => setMenuOpen(false)}
              className="border-b border-[#292929] py-3 text-lg font-medium text-[#A1A1AA] hover:text-white"
            >
              For You
            </Link>
            <Link
              to="/explore"
              onClick={() => setMenuOpen(false)}
              className="border-b border-[#292929] py-3 text-lg font-semibold text-[#FF6B00]"
            >
              Explore Catalogue
            </Link>
            <a
              href="#genres"
              onClick={() => setMenuOpen(false)}
              className="border-b border-[#292929] py-3 text-lg font-medium text-[#A1A1AA] hover:text-white"
            >
              Genres
            </a>
            <div className="mt-4 flex gap-3 pb-2">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="flex-1 border-[#292929] bg-transparent text-white"
              >
                <Link to="/login" onClick={() => setMenuOpen(false)}>
                  Log in
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="flex-1 bg-[#FF6B00] text-white hover:bg-[#FF4500]"
              >
                <Link to="/signup" onClick={() => setMenuOpen(false)}>
                  Register
                </Link>
              </Button>
            </div>
          </nav>
        )}
      </header>

      {/* EXPLORE HEADER & SEARCH */}
      <section className="relative border-b border-[#292929] bg-[#121212]/60 pt-10 pb-8 sm:pt-14 sm:pb-10">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#FF6B00]" />
                <span className="technical text-[#FF6B00]">Real Movie Catalogue</span>
              </div>
              <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
                Explore Movies
              </h1>
              <p className="mt-2 text-sm text-[#A1A1AA] sm:text-base">
                Discover your next favorite film from our verified archive.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="technical inline-flex items-center rounded-full border border-[#292929] bg-[#181818] px-3.5 py-1.5 text-xs text-[#A1A1AA]">
                <span className="font-mono text-white font-semibold mr-1.5">
                  {sortedMovies.length.toLocaleString()}
                </span>
                {sortedMovies.length === 1 ? "movie matched" : "films in catalogue"}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="technical inline-flex items-center gap-1 rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/10 px-3 py-1.5 text-xs text-[#FF6B00] transition-colors hover:bg-[#FF6B00]/20"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* SEARCH BAR */}
          <div className="explore-glow relative mt-8 rounded-2xl border border-[#292929] bg-[#181818] transition-all">
            <div className="flex items-center px-4 py-3 sm:px-5 sm:py-4">
              <Search className="shrink-0 text-[#A1A1AA]" size={22} />
              <label htmlFor="catalogue-search" className="sr-only">
                Search catalogue by title, director, genre, or studio
              </label>
              <input
                ref={searchInputRef}
                id="catalogue-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across 4,800+ films by title, director, genre, studio, year…"
                className="ml-3 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#A1A1AA]/60 sm:text-lg"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search query"
                  className="rounded-full p-1 text-[#A1A1AA] hover:bg-[#292929] hover:text-white"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* GENRE CATEGORIES CHIPS */}
          <div id="genres" className="mt-6 scroll-mt-24">
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1">
              {genreOptions.map((g) => {
                const isSelected = selectedGenre === g.name;
                return (
                  <button
                    key={g.name}
                    onClick={() => setSelectedGenre(g.name)}
                    className={`technical shrink-0 rounded-full px-4 py-2 transition-all duration-200 flex items-center gap-2 text-xs ${
                      isSelected
                        ? "bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/20 font-semibold"
                        : "border border-[#292929] bg-[#181818] text-[#A1A1AA] hover:border-[#FF6B00]/50 hover:text-white"
                    }`}
                  >
                    <span>{g.name}</span>
                    <span
                      className={`font-mono text-[10px] ${
                        isSelected ? "text-white/80" : "text-[#A1A1AA]/70"
                      }`}
                    >
                      {g.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FILTERS & SORTING TOOLBAR */}
      <section className="sticky top-16 z-30 border-b border-[#292929] bg-[#0B0B0B]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal size={14} className="mr-1 text-[#A1A1AA]" />

            {/* Decade Filter */}
            <label className="technical inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#292929] bg-[#181818] px-3 text-xs text-[#A1A1AA] hover:border-[#FF6B00]/50">
              <span>Era:</span>
              <select
                value={selectedDecade}
                onChange={(e) => setSelectedDecade(e.target.value)}
                className="bg-transparent text-white outline-none cursor-pointer"
              >
                {decadeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#181818] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Rating Filter */}
            <label className="technical inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#292929] bg-[#181818] px-3 text-xs text-[#A1A1AA] hover:border-[#FF6B00]/50">
              <Star size={12} className="text-[#FF6B00] fill-[#FF6B00]" />
              <span>Rating:</span>
              <select
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className="bg-transparent text-white outline-none cursor-pointer"
              >
                {ratingOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#181818] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Reset Filters shortcut */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="technical inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs text-[#A1A1AA] hover:text-[#FF6B00]"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <span className="technical hidden text-xs text-[#A1A1AA] sm:inline">Sort:</span>
            <label className="technical inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#292929] bg-[#181818] px-3 text-xs text-white hover:border-[#FF6B00]/50">
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value as SortOption)}
                className="bg-transparent text-white outline-none cursor-pointer font-medium"
              >
                {sortOptions.map((s) => (
                  <option key={s.value} value={s.value} className="bg-[#181818] text-white">
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {/* CATALOGUE GRID SECTION */}
      <main ref={gridRef} className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
        {/* Results Info Row */}
        <div className="mb-6 flex items-center justify-between border-b border-[#292929] pb-4">
          <p className="technical text-xs text-[#A1A1AA]">
            Showing <span className="text-white font-medium">1–{displayedMovies.length}</span> of{" "}
            <span className="text-white font-medium">{sortedMovies.length.toLocaleString()}</span>{" "}
            films
            {selectedGenre !== "All Movies" && (
              <span>
                {" "}
                in <span className="text-[#FF6B00] font-semibold">{selectedGenre}</span>
              </span>
            )}
            {query && (
              <span>
                {" "}
                matching &ldquo;<span className="text-white font-medium">{query}</span>&rdquo;
              </span>
            )}
          </p>

          <span className="technical text-xs text-[#A1A1AA] hidden sm:inline">
            Page 1 of {totalPages}
          </span>
        </div>

        {/* MOVIE GRID */}
        {displayedMovies.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-6">
            {displayedMovies.map((movie) => (
              <CatalogueMovieCard key={movie.id} movie={movie} lib={lib} actions={actions} />
            ))}
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="my-16 rounded-3xl border border-dashed border-[#292929] bg-[#121212] p-12 text-center">
            <Film className="mx-auto h-12 w-12 text-[#A1A1AA]/50" />
            <h3 className="mt-4 text-xl font-bold uppercase tracking-wide text-white">
              No matching movies found
            </h3>
            <p className="mt-2 max-w-md mx-auto text-sm text-[#A1A1AA]">
              We couldn&apos;t find any films matching &ldquo;{query}&rdquo; with the selected
              filters. Try loosening your filters or searching a different term.
            </p>
            <div className="mt-6">
              <Button
                onClick={clearAllFilters}
                className="rounded-full bg-[#FF6B00] text-white hover:bg-[#FF4500]"
              >
                <RotateCcw className="mr-2" size={14} />
                Clear all filters and search
              </Button>
            </div>
          </div>
        )}

        {/* LOAD MORE & PAGINATION */}
        {visibleCount < sortedMovies.length && (
          <div className="mt-14 flex flex-col items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handleLoadMore}
              className="h-12 rounded-full bg-[#FF6B00] px-8 font-mono text-xs uppercase tracking-wider text-white shadow-lg shadow-[#FF6B00]/20 hover:bg-[#FF4500] hover:shadow-[#FF4500]/30"
            >
              Load more films ({sortedMovies.length - visibleCount} remaining)
            </Button>
            <p className="technical text-xs text-[#A1A1AA]">
              Displaying {visibleCount} of {sortedMovies.length.toLocaleString()} total films
            </p>
          </div>
        )}
      </main>

      {/* BACK TO TOP BUTTON */}
      {showScrollTop && (
        <button
          onClick={scrollToGridTop}
          aria-label="Scroll back to top"
          className="fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full border border-[#292929] bg-[#181818]/90 text-white shadow-2xl backdrop-blur-md transition-all hover:bg-[#FF6B00] hover:scale-105"
        >
          <ArrowUp size={20} />
        </button>
      )}

      {/* MOVIE DETAIL MODAL */}
      {selectedMovie && (
        <CatalogueMovieModal
          movie={selectedMovie}
          lib={lib}
          actions={actions}
          onClose={() => setSelectedMovie(null)}
        />
      )}

      {/* USER PROFILE PANEL */}
      {panelOpen && (
        <ExploreProfilePanel
          name={name}
          email={email}
          lib={lib}
          onClose={() => setPanelOpen(false)}
          onOpenMovie={(id) => {
            const m = catalogueMovies.find((x) => x.id === id);
            if (m) {
              setPanelOpen(false);
              actions.openDetails(m);
            }
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------
// MOVIE CARD COMPONENT
// ---------------------------------------------------------
function CatalogueMovieCard({
  movie,
  lib,
  actions,
}: {
  movie: CatalogueMovie;
  lib: Lib;
  actions: {
    toggleWatchlist: (id: string) => void;
    toggleFavorite: (id: string) => void;
    rate: (id: string, stars: number) => void;
    openDetails: (m: CatalogueMovie) => void;
  };
}) {
  const [imgError, setImgError] = useState(false);
  const inWatchlist = lib.watchlist.includes(movie.id);
  const inFavorites = lib.favorites.includes(movie.id);

  const posterSrc = !imgError && movie.posterUrl ? movie.posterUrl : FALLBACK_POSTER;

  return (
    <article className="group relative flex flex-col rounded-xl bg-[#181818] border border-[#292929] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#FF6B00]/40 hover:shadow-xl hover:shadow-black/60 overflow-hidden">
      {/* POSTER WRAPPER */}
      <div
        className="relative aspect-[2/3] w-full overflow-hidden bg-[#121212] cursor-pointer"
        onClick={() => actions.openDetails(movie)}
      >
        <img
          src={posterSrc}
          alt={movie.title}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Dark subtle gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-black/30 opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Rating Badge */}
        {movie.rating !== null && movie.rating > 0 && (
          <span className="technical pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1 rounded-md bg-[#0B0B0B]/85 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md border border-[#292929]">
            <Star size={11} className="fill-[#FF6B00] text-[#FF6B00]" />
            {movie.rating.toFixed(1)}
          </span>
        )}

        {/* Quick Action Overlay (Desktop Hover) */}
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-lg bg-[#0B0B0B]/90 p-1 backdrop-blur-md border border-[#292929] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
            aria-label={inWatchlist ? "In Watchlist" : "Add to Watchlist"}
            onClick={(e) => {
              e.stopPropagation();
              actions.toggleWatchlist(movie.id);
            }}
            className={`grid h-8 w-8 place-items-center rounded-md transition-colors ${
              inWatchlist
                ? "bg-[#FF6B00] text-white"
                : "text-[#A1A1AA] hover:bg-[#292929] hover:text-white"
            }`}
          >
            <Bookmark size={14} className={inWatchlist ? "fill-white" : ""} />
          </button>

          <button
            type="button"
            title={inFavorites ? "Remove from Favorites" : "Add to Favorites"}
            aria-label={inFavorites ? "Favorited" : "Add to Favorites"}
            onClick={(e) => {
              e.stopPropagation();
              actions.toggleFavorite(movie.id);
            }}
            className={`grid h-8 w-8 place-items-center rounded-md transition-colors ${
              inFavorites
                ? "bg-rose-600 text-white"
                : "text-[#A1A1AA] hover:bg-[#292929] hover:text-white"
            }`}
          >
            <Heart size={14} className={inFavorites ? "fill-white" : ""} />
          </button>

          <button
            type="button"
            title="View Details"
            aria-label="View Movie Details"
            onClick={(e) => {
              e.stopPropagation();
              actions.openDetails(movie);
            }}
            className="grid h-8 w-8 place-items-center rounded-md text-[#A1A1AA] hover:bg-[#292929] hover:text-white transition-colors"
          >
            <Play size={13} className="ml-0.5" />
          </button>
        </div>
      </div>

      {/* METADATA CONTENT */}
      <div className="flex flex-1 flex-col p-3">
        <button
          onClick={() => actions.openDetails(movie)}
          className="text-left group/title focus:outline-none"
        >
          <h3
            title={movie.title}
            className="line-clamp-1 font-sans text-sm font-semibold text-white group-hover/title:text-[#FF6B00] transition-colors"
          >
            {movie.title}
          </h3>
        </button>

        <div className="mt-1 flex items-center justify-between text-xs text-[#A1A1AA]">
          <span className="technical text-[10px]">{movie.year ?? "N/A"}</span>
          <span className="technical text-[10px] truncate max-w-[90px] text-right text-[#A1A1AA]/80">
            {movie.genre}
          </span>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------
// MOVIE DETAIL MODAL COMPONENT
// ---------------------------------------------------------
function CatalogueMovieModal({
  movie,
  lib,
  actions,
  onClose,
}: {
  movie: CatalogueMovie;
  lib: Lib;
  actions: {
    toggleWatchlist: (id: string) => void;
    toggleFavorite: (id: string) => void;
    rate: (id: string, stars: number) => void;
  };
  onClose: () => void;
}) {
  const [playingTrailer, setPlayingTrailer] = useState(false);
  const [imgError, setImgError] = useState(false);

  const inWatchlist = lib.watchlist.includes(movie.id);
  const inFavorites = lib.favorites.includes(movie.id);
  const userRating = lib.ratings[movie.id] ?? 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const posterSrc = !imgError && movie.posterUrl ? movie.posterUrl : FALLBACK_POSTER;

  const formatCurrency = (val: number | null) => {
    if (!val || val <= 0) return null;
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    return `$${val.toLocaleString()}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={movie.title}
    >
      <div
        className="relative my-8 w-full max-w-3xl overflow-hidden rounded-2xl border border-[#292929] bg-[#121212] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-[#0B0B0B]/80 text-[#A1A1AA] hover:bg-[#181818] hover:text-white border border-[#292929]"
        >
          <X size={18} />
        </button>

        <div className="grid md:grid-cols-[280px_1fr]">
          {/* POSTER / TRAILER SECTION */}
          <div className="relative aspect-[2/3] bg-[#0B0B0B] md:aspect-auto">
            {playingTrailer ? (
              <video
                src={trailerVideo}
                poster={posterSrc}
                autoPlay
                controls
                className="h-full w-full object-cover"
              />
            ) : (
              <>
                <img
                  src={posterSrc}
                  alt={movie.title}
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => setPlayingTrailer(true)}
                  aria-label="Preview trailer"
                  className="absolute inset-0 grid place-items-center bg-black/40 transition-colors hover:bg-black/20"
                >
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-[#FF6B00] text-white shadow-xl shadow-[#FF6B00]/40 transition-transform hover:scale-110">
                    <Play className="ml-1" size={24} />
                  </span>
                </button>
              </>
            )}
          </div>

          {/* MOVIE DETAILS SECTION */}
          <div className="flex flex-col justify-between p-6 sm:p-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="technical rounded bg-[#FF6B00]/15 px-2 py-0.5 text-xs text-[#FF6B00] font-semibold">
                  {movie.genre}
                </span>
                {movie.language && (
                  <span className="technical rounded bg-[#181818] px-2 py-0.5 text-xs text-[#A1A1AA] border border-[#292929]">
                    {movie.language}
                  </span>
                )}
                {movie.country && (
                  <span className="technical text-xs text-[#A1A1AA]">· {movie.country}</span>
                )}
              </div>

              <h2 className="mt-3 text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
                {movie.title}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#A1A1AA]">
                {movie.year && <span className="technical">{movie.year}</span>}
                {movie.runtime && (
                  <span className="technical flex items-center gap-1">
                    <Clock size={12} /> {movie.runtime} min
                  </span>
                )}
                {movie.rating !== null && (
                  <span className="technical flex items-center gap-1 font-semibold text-white">
                    <Star size={13} className="fill-[#FF6B00] text-[#FF6B00]" />
                    {movie.rating.toFixed(1)} / 10
                    {movie.voteCount > 0 && (
                      <span className="text-[#A1A1AA] font-normal">
                        ({movie.voteCount.toLocaleString()} votes)
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Extended Metadata Table */}
              <div className="mt-6 space-y-3 border-t border-[#292929] pt-4 text-xs">
                {movie.director && (
                  <div className="flex justify-between">
                    <span className="technical text-[#A1A1AA]">Director</span>
                    <span className="font-medium text-white">{movie.director}</span>
                  </div>
                )}
                {movie.studio && (
                  <div className="flex justify-between">
                    <span className="technical text-[#A1A1AA]">Studio</span>
                    <span className="font-medium text-white">{movie.studio}</span>
                  </div>
                )}
                {movie.budget && (
                  <div className="flex justify-between">
                    <span className="technical text-[#A1A1AA]">Budget</span>
                    <span className="font-mono text-white">{formatCurrency(movie.budget)}</span>
                  </div>
                )}
                {movie.revenue && (
                  <div className="flex justify-between">
                    <span className="technical text-[#A1A1AA]">Revenue</span>
                    <span className="font-mono text-[#00FF9C]">
                      {formatCurrency(movie.revenue)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="technical text-[#A1A1AA]">Popularity Index</span>
                  <span className="font-mono text-white">
                    {movie.popularity?.toFixed(1) ?? "N/A"}
                  </span>
                </div>
              </div>

              {/* User Rating Controls */}
              <div className="mt-6 border-t border-[#292929] pt-4">
                <p className="technical text-xs text-[#A1A1AA]">Your Rating</p>
                <div className="mt-2 flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => actions.rate(movie.id, star)}
                      aria-label={`Rate ${star} of 5 stars`}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        size={20}
                        className={
                          star <= userRating
                            ? "fill-[#FF6B00] text-[#FF6B00]"
                            : "text-[#292929] hover:text-[#A1A1AA]"
                        }
                      />
                    </button>
                  ))}
                  {userRating > 0 && (
                    <span className="technical ml-2 text-xs text-[#FF6B00]">
                      {userRating} / 5 Stars
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-8 flex flex-wrap gap-2.5 border-t border-[#292929] pt-5">
              <Button
                onClick={() => setPlayingTrailer(!playingTrailer)}
                className="rounded-full bg-[#FF6B00] text-white hover:bg-[#FF4500]"
              >
                <Play size={15} className="mr-1.5" />
                {playingTrailer ? "Hide Trailer" : "Watch Trailer"}
              </Button>

              <Button
                variant="outline"
                onClick={() => actions.toggleWatchlist(movie.id)}
                className={`rounded-full border-[#292929] ${
                  inWatchlist
                    ? "bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/40"
                    : "bg-transparent text-white hover:bg-[#181818]"
                }`}
              >
                <Bookmark size={15} className={`mr-1.5 ${inWatchlist ? "fill-[#FF6B00]" : ""}`} />
                {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
              </Button>

              <Button
                variant="outline"
                onClick={() => actions.toggleFavorite(movie.id)}
                className={`rounded-full border-[#292929] ${
                  inFavorites
                    ? "bg-rose-500/15 text-rose-400 border-rose-500/40"
                    : "bg-transparent text-white hover:bg-[#181818]"
                }`}
              >
                <Heart
                  size={15}
                  className={`mr-1.5 ${inFavorites ? "fill-rose-500 text-rose-500" : ""}`}
                />
                {inFavorites ? "Favorited" : "Favorite"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// PROFILE SIDE DRAWER COMPONENT
// ---------------------------------------------------------
function ExploreProfilePanel({
  name,
  email,
  lib,
  onClose,
  onOpenMovie,
}: {
  name: string;
  email: string;
  lib: Lib;
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
        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-[#292929] bg-[#181818] p-3">
            <p className="text-xl font-bold text-white">{lib.watchlist.length}</p>
            <p className="technical text-[10px] text-[#A1A1AA]">Watchlist</p>
          </div>
          <div className="rounded-xl border border-[#292929] bg-[#181818] p-3">
            <p className="text-xl font-bold text-white">{lib.favorites.length}</p>
            <p className="technical text-[10px] text-[#A1A1AA]">Favorites</p>
          </div>
          <div className="rounded-xl border border-[#292929] bg-[#181818] p-3">
            <p className="text-xl font-bold text-white">{Object.keys(lib.ratings).length}</p>
            <p className="technical text-[10px] text-[#A1A1AA]">Rated</p>
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

        {/* Items List */}
        <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
          {currentIds.length > 0 ? (
            currentIds.map((id) => {
              const movie = catalogueMovies.find((m) => m.id === id);
              if (!movie) {
                return (
                  <div
                    key={id}
                    className="rounded-xl border border-[#292929] bg-[#181818] p-3 text-xs text-[#A1A1AA]"
                  >
                    Movie #{id}
                  </div>
                );
              }
              return (
                <button
                  key={movie.id}
                  onClick={() => onOpenMovie(movie.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[#292929] bg-[#181818] p-2 text-left transition-colors hover:border-[#FF6B00]/40 hover:bg-[#1f1f1f]"
                >
                  <img
                    src={movie.posterUrl || FALLBACK_POSTER}
                    alt={movie.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_POSTER;
                    }}
                    className="h-14 w-10 rounded-md object-cover bg-black"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white text-sm">{movie.title}</p>
                    <p className="technical text-[10px] text-[#A1A1AA]">
                      {movie.year ?? "N/A"} · {movie.genre}
                      {lib.ratings[movie.id] ? ` · ★ ${lib.ratings[movie.id]}` : ""}
                    </p>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-16 text-center text-sm text-[#A1A1AA]">
              No films in your {tab} yet.
            </div>
          )}
        </div>

        {/* Auth footer */}
        <div className="mt-6 border-t border-[#292929] pt-4">
          <div className="flex gap-2">
            {!name ? (
              <>
                <Button
                  asChild
                  size="sm"
                  className="flex-1 rounded-full bg-[#FF6B00] text-white hover:bg-[#FF4500]"
                >
                  <Link to="/signup" onClick={onClose}>
                    Register
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-full border-[#292929] bg-transparent text-white hover:bg-[#181818]"
                >
                  <Link to="/login" onClick={onClose}>
                    Log in
                  </Link>
                </Button>
              </>
            ) : (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="w-full rounded-full border-[#292929] bg-transparent text-white hover:bg-[#181818]"
              >
                <Link to="/profile" onClick={onClose}>
                  View Account
                </Link>
              </Button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
