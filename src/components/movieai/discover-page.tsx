import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  Clock,
  Heart,
  History,
  Play,
  Search,
  SlidersHorizontal,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import Aurora from "@/components/Aurora";
import { Button } from "@/components/ui/button";
import trailer from "@/assets/goodbye_web.webm";
import { useMovieDemo, type Library as Lib, type Reaction } from "./demo-context";
import {
  genres,
  getMovieById,
  languages,
  ratingSteps,
  realMovies,
  years,
  type Movie,
} from "./discover-data";
import { matchesDecade } from "@/data/catalogue-data";

const toggleIn = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

const byId = (id: string): Movie | undefined => getMovieById(id);

export function DiscoverPage() {
  const { name, email, library: lib, setLibrary: setLib } = useMovieDemo();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState(["Christopher Nolan", "Interstellar", "Deadpool"]);
  const [genre, setGenre] = useState("All");
  const [language, setLanguage] = useState("All");
  const [year, setYear] = useState("All");
  const [minRating, setMinRating] = useState(0);
  const [panel, setPanel] = useState(false);
  const [tab, setTab] = useState<"history" | "watchlist" | "favorites">("history");
  const [visibleExploreCount, setVisibleExploreCount] = useState(24);
  const [featuredImgError, setFeaturedImgError] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const q = query.toLowerCase().trim();

  // Search & Filtered catalog
  const filtered = useMemo(() => {
    return realMovies
      .filter((m) => {
        if (q) {
          const matchesQ =
            m.title.toLowerCase().includes(q) ||
            m.director.toLowerCase().includes(q) ||
            m.genre.toLowerCase().includes(q);
          if (!matchesQ) return false;
        }
        if (genre !== "All" && m.genre !== genre) return false;
        if (language !== "All" && m.language !== language) return false;
        if (year !== "All" && !matchesDecade(m.year, year)) return false;
        if (minRating > 0 && m.rating < minRating) return false;
        return true;
      })
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }, [q, genre, language, year, minRating]);

  // Derived user taste profile
  const likedGenres = useMemo(() => {
    const list: string[] = [];
    Object.entries(lib.reactions).forEach(([id, r]) => {
      if (r === "like") {
        const m = byId(id);
        if (m?.genre) list.push(m.genre);
      }
    });
    lib.favorites.forEach((id) => {
      const m = byId(id);
      if (m?.genre) list.push(m.genre);
    });
    return new Set(list);
  }, [lib.reactions, lib.favorites]);

  const disliked = useMemo(() => {
    return new Set(
      Object.entries(lib.reactions)
        .filter(([, r]) => r === "dislike")
        .map(([id]) => id)
    );
  }, [lib.reactions]);

  // Recommendations: Prioritize user's liked genres and high-quality popular films with posters
  const recommended = useMemo(() => {
    const watched = new Set(lib.watched);
    const pool = realMovies.filter(
      (m) => m.hasPoster && !disliked.has(m.id) && !watched.has(m.id)
    );

    return [...pool].sort((a, b) => {
      const aLiked = likedGenres.has(a.genre) ? 1 : 0;
      const bLiked = likedGenres.has(b.genre) ? 1 : 0;
      if (bLiked !== aLiked) return bLiked - aLiked;

      // Quality score: rating + log popularity
      const aScore = (a.rating || 0) * 8 + Math.log10((a.popularity || 1) + 1) * 2;
      const bScore = (b.rating || 0) * 8 + Math.log10((b.popularity || 1) + 1) * 2;
      return bScore - aScore;
    });
  }, [lib.watched, disliked, likedGenres]);

  // Top featured film: high rating, verified poster, visually engaging
  const featured = useMemo(() => {
    return (
      recommended.find((m) => m.hasPoster && m.rating >= 7.6 && (m.voteCount || 0) > 1000) ??
      recommended[0] ??
      realMovies[0]
    );
  }, [recommended]);

  // Reset featured image error when featured movie changes
  useEffect(() => {
    setFeaturedImgError(false);
  }, [featured.id]);

  // "Because you watched" based on actual viewing history
  const lastWatched = useMemo(() => {
    if (!lib.history.length) return undefined;
    return byId(lib.history[0]);
  }, [lib.history]);

  const because = useMemo(() => {
    if (!lastWatched) return [];
    return realMovies
      .filter(
        (m) =>
          m.id !== lastWatched.id &&
          m.hasPoster &&
          !lib.watched.includes(m.id) &&
          !disliked.has(m.id) &&
          (m.genre === lastWatched.genre ||
            (m.director && m.director !== "Unknown Director" && m.director === lastWatched.director))
      )
      .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 10);
  }, [lastWatched, lib.watched, disliked]);

  // Genre carousel: selected genre or user's top liked genre
  const genreRow = useMemo(() => {
    const targetGenre = genre !== "All" ? genre : (Array.from(likedGenres)[0] || "Action");
    return realMovies
      .filter((m) => m.genre === targetGenre && m.hasPoster && !disliked.has(m.id))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 12);
  }, [genre, likedGenres, disliked]);

  const filtersActive = genre !== "All" || language !== "All" || year !== "All" || minRating > 0;

  const actions = {
    react: (id: string, r: Reaction) =>
      setLib((l) => {
        const next = { ...l.reactions };
        if (next[id] === r) delete next[id];
        else next[id] = r;
        return { ...l, reactions: next };
      }),
    rate: (id: string, n: number) =>
      setLib((l) => ({ ...l, ratings: { ...l.ratings, [id]: n } })),
    fav: (id: string) =>
      setLib((l) => ({ ...l, favorites: toggleIn(l.favorites, id) })),
    watch: (id: string) =>
      setLib((l) => ({ ...l, watchlist: toggleIn(l.watchlist, id) })),
    open: (m: Movie) => {
      navigate({ to: "/movie/$movieId", params: { movieId: m.id } });
      setLib((l) => ({
        ...l,
        history: [m.id, ...l.history.filter((x) => x !== m.id)],
      }));
    },
  };

  const submitSearch = () => {
    if (q)
      setRecent((r) => [
        query.trim(),
        ...r.filter((x) => x.toLowerCase() !== query.trim().toLowerCase()),
      ].slice(0, 5));
    setFocused(false);
    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
  };

  const resetFilters = () => {
    setGenre("All");
    setLanguage("All");
    setYear("All");
    setMinRating(0);
  };

  // Top trending search preview items
  const trendingSearchItems = useMemo(() => {
    if (q) return filtered.slice(0, 6);
    return realMovies
      .filter((m) => m.hasPoster && m.rating >= 7.5)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 6);
  }, [q, filtered]);

  return (
    <div className="cinema min-h-screen">
      {/* 1. HEADER */}
      <header className="glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-10">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold tracking-tight"
            aria-label="MOVIEAI Home"
          >
            <span className="h-3 w-3 bg-primary rounded-xs" /> MOVIEAI
            <span className="text-signal">.</span>
          </Link>
          <nav aria-label="Main Navigation" className="hidden gap-8 md:flex">
            <a
              href="#for-you"
              className="technical text-muted-foreground transition-colors hover:text-foreground"
            >
              For you
            </a>
            <Link
              to="/explore"
              className="technical text-muted-foreground transition-colors hover:text-foreground"
            >
              Explore
            </Link>
            <a
              href="#genres"
              className="technical text-muted-foreground transition-colors hover:text-foreground"
            >
              Genres
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {!name && (
              <Link
                to="/login"
                className="technical hidden px-3 hover:text-primary sm:block"
              >
                Log in
              </Link>
            )}
            {!name && (
              <Button
                asChild
                size="sm"
                className="hidden rounded-full font-mono text-[10px] uppercase sm:inline-flex"
              >
                <Link to="/signup">Register</Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPanel(true)}
              aria-label="Open profile"
              className="rounded-full border border-border"
            >
              <User />
            </Button>
          </div>
        </div>
      </header>

      {/* 2. HERO SEARCH & AURORA */}
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-80">
          <Aurora
            colorStops={["#00FF9C", "#00C9B7", "#071014"]}
            amplitude={2.1}
            blend={0.5}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-background to-transparent" />
        <div className="mx-auto max-w-[1100px] px-5 pb-16 pt-16 md:pt-24">
          <p className="technical text-primary">
            ◼ {name ? `Welcome back, ${name.split(" ")[0]}` : "Discover"}
          </p>
          <h1 className="display mt-5 text-[clamp(2.8rem,7vw,6.5rem)]">
            What will you
            <br />
            watch tonight?
          </h1>

          {/* Search Box */}
          <div ref={searchRef} className="relative mt-10">
            <div className="glass search-glow rounded-2xl border border-border px-5 py-4 md:px-6 md:py-5">
              <div className="flex items-center gap-4">
                <Search className="shrink-0 text-muted-foreground" size={26} />
                <label className="sr-only" htmlFor="movie-search">
                  Search movies, actors or directors
                </label>
                <input
                  id="movie-search"
                  value={query}
                  onFocus={() => setFocused(true)}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitSearch();
                    if (e.key === "Escape") setFocused(false);
                  }}
                  placeholder="Search movies, genres, directors…"
                  className="min-w-0 flex-1 bg-transparent text-xl outline-none placeholder:text-muted-foreground/70 md:text-3xl"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X />
                  </button>
                )}
              </div>
              <p className="ml-[42px] mt-1 text-xs text-muted-foreground">
                Press Enter to explore all matching titles in the catalogue
              </p>
            </div>

            {/* Real Search Dropdown */}
            {focused && (
              <div className="glass absolute inset-x-0 top-full z-30 mt-3 max-h-[420px] overflow-y-auto rounded-2xl border border-border p-5 shadow-2xl">
                {!q && recent.length > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="technical text-muted-foreground">Recent</span>
                      <button
                        onClick={() => setRecent([])}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recent.map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
                        >
                          <button
                            onClick={() => {
                              setQuery(r);
                              submitSearch();
                            }}
                            className="inline-flex items-center gap-2"
                          >
                            <Clock size={14} />
                            {r}
                          </button>
                          <button
                            aria-label={`Remove ${r}`}
                            onClick={() => setRecent(recent.filter((x) => x !== r))}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </>
                )}

                <p className="technical mt-5 flex items-center gap-2 text-signal first:mt-0">
                  <TrendingUp size={14} />{" "}
                  {q ? `Results / ${filtered.length}` : "Curated & Popular"}
                </p>
                {trendingSearchItems.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      actions.open(m);
                      setFocused(false);
                    }}
                    className="mt-2 flex w-full items-center gap-4 rounded-lg p-2 text-left transition-colors hover:bg-muted"
                  >
                    <img
                      src={m.image || "/poster-fallback.svg"}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/poster-fallback.svg";
                      }}
                      className="h-14 w-11 rounded-md object-cover bg-muted shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold truncate text-foreground">
                        {m.title}
                      </span>
                      <span className="text-sm text-muted-foreground block truncate">
                        {m.year || "N/A"} ·{" "}
                        <Star size={12} className="inline fill-signal text-signal" />{" "}
                        {m.rating ? m.rating.toFixed(1) : "N/A"} · {m.director}
                      </span>
                    </span>
                  </button>
                ))}
                {q && filtered.length === 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No titles, genres or directors match "{query}".
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Filter Bar */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <SlidersHorizontal size={16} className="mr-1 text-muted-foreground" />
            <FilterSelect label="Genre" value={genre} options={genres} onChange={setGenre} />
            <FilterSelect
              label="Language"
              value={language}
              options={languages}
              onChange={setLanguage}
            />
            <FilterSelect
              label="Decade"
              value={year}
              options={years}
              onChange={setYear}
              format={(v) => (v === "classic" ? "Classic (<1970)" : v)}
            />
            <FilterSelect
              label="Rating"
              value={String(minRating)}
              options={ratingSteps.map(String)}
              format={(v) => (v === "0" ? "Any" : `${v}+`)}
              onChange={(v) => setMinRating(Number(v))}
            />
            {filtersActive && (
              <button
                onClick={resetFilters}
                className="technical px-2 text-muted-foreground hover:text-foreground"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 3. MAIN CONTENT SECTIONS */}
      <main className="mx-auto max-w-[1440px] space-y-20 px-5 pb-24 md:px-10">
        {/* Top Featured Hero Card */}
        <section
          id="for-you"
          className="grid scroll-mt-24 overflow-hidden rounded-3xl border border-border bg-card md:grid-cols-[1.2fr_1fr]"
        >
          <div className="relative min-h-[340px] overflow-hidden bg-[#0A0A0A]">
            <img
              src={featuredImgError ? "/poster-fallback.svg" : featured.image}
              alt={featured.title}
              onError={() => setFeaturedImgError(true)}
              className="absolute inset-0 h-full w-full object-cover filter brightness-75 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent md:bg-gradient-to-r md:from-transparent md:to-card" />
          </div>
          <div className="flex flex-col justify-center p-7 md:p-12">
            <span className="technical text-primary">Top pick for you</span>
            <h2 className="display mt-4 text-4xl sm:text-5xl md:text-6xl text-foreground">
              {featured.title}
            </h2>
            <p className="technical mt-4 text-muted-foreground">
              {featured.year || "N/A"} / {featured.genre} / {featured.language} / ★{" "}
              {featured.rating ? featured.rating.toFixed(1) : "N/A"}
            </p>
            <p className="mt-5 max-w-md text-muted-foreground text-sm sm:text-base line-clamp-3">
              {featured.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                onClick={() => actions.open(featured)}
                className="rounded-full px-6 font-semibold"
              >
                <Play size={16} className="mr-1.5" /> View movie
              </Button>
              <Button
                variant="outline"
                onClick={() => actions.watch(featured.id)}
                className="rounded-full border-border bg-transparent px-6 font-medium"
              >
                <Bookmark
                  size={16}
                  className={
                    lib.watchlist.includes(featured.id) ? "fill-primary text-primary" : ""
                  }
                />{" "}
                {lib.watchlist.includes(featured.id) ? "In watchlist" : "Watchlist"}
              </Button>
            </div>
          </div>
        </section>

        {/* Section 1: Recommended For You */}
        <Row
          title="Recommended for you"
          meta={likedGenres.size > 0 ? "Shaped by your taste & favorites" : "Popular & critically acclaimed"}
          items={recommended.slice(0, 10)}
          lib={lib}
          actions={actions}
        />

        {/* Section 2: Because you watched */}
        {lastWatched && because.length > 0 && (
          <Row
            title={`Because you watched ${lastWatched.title}`}
            meta={`Titles in ${lastWatched.genre}${lastWatched.director !== "Unknown Director" ? ` or directed by ${lastWatched.director}` : ""}`}
            items={because}
            lib={lib}
            actions={actions}
          />
        )}

        {/* Section 3: Genre Spotlight */}
        <div id="genres" className="scroll-mt-24">
          {genreRow.length > 0 ? (
            <Row
              title={genre !== "All" ? `Best in ${genre}` : `Best in ${Array.from(likedGenres)[0] || "Action"}`}
              meta="Top rated in the catalogue"
              items={genreRow}
              lib={lib}
              actions={actions}
            />
          ) : (
            <p className="text-muted-foreground">Select a genre to view top recommendations.</p>
          )}
        </div>

        {/* Section 4: Trending / Explore Grid */}
        <section id="explore" className="scroll-mt-24">
          <SectionHead
            title="Curated Catalogue"
            meta={`${filtered.length} films${q ? ` matching "${query}"` : " available"}`}
          />
          {filtered.length ? (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
                {filtered.slice(0, visibleExploreCount).map((m) => (
                  <MovieCard key={m.id} movie={m} lib={lib} actions={actions} />
                ))}
              </div>
              {visibleExploreCount < filtered.length && (
                <div className="mt-12 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleExploreCount((prev) => prev + 24)}
                    className="rounded-full px-8 py-5 border-border hover:bg-muted font-medium text-sm"
                  >
                    Load More Titles ({filtered.length - visibleExploreCount} remaining)
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border py-20 text-center">
              <p className="text-xl">No films match these filters.</p>
              <Button
                variant="link"
                onClick={() => {
                  resetFilters();
                  setQuery("");
                }}
              >
                Clear search & filters
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* 4. PROFILE SLIDE-OVER PANEL */}
      {panel && (
        <ProfilePanel
          name={name}
          email={email}
          lib={lib}
          tab={tab}
          setTab={setTab}
          onClose={() => setPanel(false)}
          onOpen={(m) => {
            setPanel(false);
            actions.open(m);
          }}
        />
      )}
    </div>
  );
}

type Actions = {
  react: (id: string, r: Reaction) => void;
  rate: (id: string, n: number) => void;
  fav: (id: string) => void;
  watch: (id: string) => void;
  open: (m: Movie) => void;
};

function FilterSelect({
  label,
  value,
  options,
  onChange,
  format = (v) => v,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  format?: (v: string) => string;
}) {
  const active = value !== "All" && value !== "0";
  return (
    <label
      className={`technical inline-flex h-10 items-center gap-2 rounded-full border px-4 transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-foreground outline-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-card text-foreground">
            {format(o)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionHead({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-t border-border pt-4">
      <h2 className="text-2xl font-semibold uppercase md:text-3xl text-foreground">
        {title}
      </h2>
      <span className="technical shrink-0 text-muted-foreground">{meta}</span>
    </div>
  );
}

function Row({
  title,
  meta,
  items,
  lib,
  actions,
}: {
  title: string;
  meta: string;
  items: Movie[];
  lib: Lib;
  actions: Actions;
}) {
  return (
    <section>
      <SectionHead title={title} meta={meta} />
      <div className="no-scrollbar -mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 md:gap-6">
        {items.map((m) => (
          <div key={m.id} className="w-[60vw] shrink-0 snap-start sm:w-[260px]">
            <MovieCard movie={m} lib={lib} actions={actions} />
          </div>
        ))}
      </div>
    </section>
  );
}

function MovieCard({
  movie: m,
  lib,
  actions,
}: {
  movie: Movie;
  lib: Lib;
  actions: Actions;
}) {
  const [imgError, setImgError] = useState(false);
  const r = lib.reactions[m.id];
  const posterSrc = !imgError && m.image ? m.image : "/poster-fallback.svg";

  return (
    <article className="group transition-transform duration-300 hover:-translate-y-1.5">
      <div className="notch-card relative aspect-[3/4] overflow-hidden bg-muted">
        <Link
          to="/movie/$movieId"
          params={{ movieId: m.id }}
          className="absolute inset-0 block bg-[#141416]"
          aria-label={`Open ${m.title}`}
        >
          <img
            src={posterSrc}
            alt={m.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </Link>
        <span className="technical pointer-events-none absolute left-3 top-3 rounded-full bg-background/80 px-2.5 py-1 backdrop-blur border border-border/50">
          <Star size={10} className="mr-1 inline fill-signal text-signal" />
          {m.rating ? m.rating.toFixed(1) : "N/A"}
        </span>
        <div className="absolute inset-x-2 bottom-2 flex justify-between rounded-xl bg-background/80 p-1 backdrop-blur border border-border/40 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <IconAction
            label="Like"
            on={r === "like"}
            onClick={() => actions.react(m.id, "like")}
          >
            <ThumbsUp />
          </IconAction>
          <IconAction
            label="Dislike"
            on={r === "dislike"}
            onClick={() => actions.react(m.id, "dislike")}
          >
            <ThumbsDown />
          </IconAction>
          <IconAction
            label="Favorite"
            on={lib.favorites.includes(m.id)}
            onClick={() => actions.fav(m.id)}
          >
            <Heart />
          </IconAction>
          <IconAction
            label="Watchlist"
            on={lib.watchlist.includes(m.id)}
            onClick={() => actions.watch(m.id)}
          >
            <Bookmark />
          </IconAction>
        </div>
      </div>
      <Link
        to="/movie/$movieId"
        params={{ movieId: m.id }}
        className="hover:underline block"
      >
        <h3 className="mt-3 truncate font-semibold" title={m.title}>
          {m.title}
        </h3>
      </Link>
      <p className="technical text-muted-foreground truncate">
        {m.year || "N/A"} / {m.genre}
      </p>
    </article>
  );
}

function IconAction({
  label,
  on,
  onClick,
  children,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      title={label}
      className={`grid h-10 w-10 place-items-center rounded-lg transition-colors [&_svg]:size-4 ${
        on
          ? "text-primary [&_svg]:fill-primary/30"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function MovieModal({
  movie: m,
  lib,
  actions,
  onClose,
}: {
  movie: Movie;
  lib: Lib;
  actions: Actions;
  onClose: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const myRating = lib.ratings[m.id] ?? 0;
  const posterSrc = !imgError && m.image ? m.image : "/poster-fallback.svg";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm md:items-center md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={m.title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="reveal relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-border bg-card md:rounded-3xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/80"
        >
          <X size={18} />
        </button>
        <div className="relative aspect-video bg-background">
          {playing ? (
            <video
              src={trailer}
              poster={posterSrc}
              autoPlay
              controls
              className="h-full w-full object-cover"
            />
          ) : (
            <>
              <img
                src={posterSrc}
                alt={m.title}
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => setPlaying(true)}
                className="absolute inset-0 grid place-items-center"
              >
                <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-110">
                  <Play className="ml-1" />
                </span>
                <span className="sr-only">Play trailer</span>
              </button>
            </>
          )}
        </div>
        <div className="grid gap-8 p-6 md:grid-cols-[1.4fr_1fr] md:p-10">
          <div>
            <p className="technical text-primary">
              {m.genre} / {m.language}
            </p>
            <h2 className="display mt-3 text-4xl md:text-5xl">{m.title}</h2>
            <p className="technical mt-3 text-muted-foreground">
              {m.year || "N/A"} · {m.runtime} · ★ {m.rating ? m.rating.toFixed(1) : "N/A"}
            </p>
            <p className="mt-5 leading-relaxed text-muted-foreground">{m.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => setPlaying(true)} className="rounded-full">
                <Play /> Trailer
              </Button>
              <Button
                variant="outline"
                onClick={() => actions.fav(m.id)}
                className="rounded-full border-border bg-transparent"
              >
                <Heart
                  className={lib.favorites.includes(m.id) ? "fill-primary text-primary" : ""}
                />{" "}
                Favorite
              </Button>
              <Button
                variant="outline"
                onClick={() => actions.watch(m.id)}
                className="rounded-full border-border bg-transparent"
              >
                <Bookmark
                  className={lib.watchlist.includes(m.id) ? "fill-primary text-primary" : ""}
                />{" "}
                Watchlist
              </Button>
            </div>
          </div>
          <div className="space-y-5 border-t border-border pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <div>
              <p className="technical text-muted-foreground">Director</p>
              <p className="mt-1">{m.director}</p>
            </div>
            {m.cast.length > 0 && (
              <div>
                <p className="technical text-muted-foreground">Cast</p>
                <p className="mt-1">{m.cast.join(", ")}</p>
              </div>
            )}
            <div>
              <p className="technical text-muted-foreground">Your rating</p>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => actions.rate(m.id, n)}
                    aria-label={`Rate ${n} of 5`}
                  >
                    <Star
                      className={`size-6 transition-colors ${
                        n <= myRating
                          ? "fill-signal text-signal"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <IconAction
                label="Like"
                on={lib.reactions[m.id] === "like"}
                onClick={() => actions.react(m.id, "like")}
              >
                <ThumbsUp />
              </IconAction>
              <IconAction
                label="Dislike"
                on={lib.reactions[m.id] === "dislike"}
                onClick={() => actions.react(m.id, "dislike")}
              >
                <ThumbsDown />
              </IconAction>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfilePanel({
  name,
  email,
  lib,
  tab,
  setTab,
  onClose,
  onOpen,
}: {
  name: string;
  email: string;
  lib: Lib;
  tab: "history" | "watchlist" | "favorites";
  setTab: (t: "history" | "watchlist" | "favorites") => void;
  onClose: () => void;
  onOpen: (m: Movie) => void;
}) {
  const lists = { history: lib.history, watchlist: lib.watchlist, favorites: lib.favorites };
  const icons = { history: History, watchlist: Bookmark, favorites: Heart };
  const items = lists[tab].map(byId).filter(Boolean) as Movie[];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card p-6"
        aria-label="Profile"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
              <User />
            </span>
            <div>
              <p className="text-lg font-semibold">{name || "Guest viewer"}</p>
              <p className="text-sm text-muted-foreground">{email || "Not signed in"}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close profile">
            <X />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            ["Ratings", Object.keys(lib.ratings).length],
            ["Likes", Object.values(lib.reactions).filter((r) => r === "like").length],
            ["Watched", lib.history.length],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-muted p-3">
              <p className="text-2xl font-semibold">{v}</p>
              <p className="technical text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-1 rounded-full bg-muted p-1">
          {(Object.keys(lists) as (keyof typeof lists)[]).map((t) => {
            const I = icons[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`technical flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 transition-colors ${
                  tab === t ? "bg-background text-foreground" : "text-muted-foreground"
                }`}
              >
                <I size={13} />
                {t} ({lists[t].length})
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex-1 space-y-2">
          {items.length ? (
            items.map((m) => (
              <button
                key={m.id}
                onClick={() => onOpen(m)}
                className="flex w-full items-center gap-4 rounded-xl p-2 text-left hover:bg-muted"
              >
                <img
                  src={m.image || "/poster-fallback.svg"}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/poster-fallback.svg";
                  }}
                  className="h-16 w-12 rounded-md object-cover bg-muted shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold truncate">{m.title}</span>
                  <span className="technical text-muted-foreground truncate block">
                    {m.year || "N/A"} / {m.genre}
                    {lib.ratings[m.id] ? ` / ${lib.ratings[m.id]}★ yours` : ""}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nothing here yet.
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-2 border-t border-border pt-5">
          {name ? (
            <Button
              asChild
              variant="outline"
              className="flex-1 rounded-full border-border bg-transparent"
            >
              <Link to="/profile">Full profile</Link>
            </Button>
          ) : (
            <>
              <Button asChild className="flex-1 rounded-full">
                <Link to="/signup">Register</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="flex-1 rounded-full border-border bg-transparent"
              >
                <Link to="/login">Log in</Link>
              </Button>
            </>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Preview only — your activity resets on refresh.
        </p>
      </aside>
    </div>
  );
}
