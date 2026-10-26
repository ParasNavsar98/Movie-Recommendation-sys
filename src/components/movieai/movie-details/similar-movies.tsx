import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Sparkles, Star } from "lucide-react";
import type { CatalogueMovie } from "@/data/catalogue-data";
import { movieAiApi, type RecommendationItem } from "@/lib/api-client";

interface SimilarMoviesProps {
  movies: CatalogueMovie[];
  movieId?: string;
}

export function SimilarMovies({ movies, movieId }: SimilarMoviesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [engineRecs, setEngineRecs] = useState<RecommendationItem[] | null>(null);

  useEffect(() => {
    if (!movieId || isNaN(Number(movieId))) {
      setEngineRecs(null);
      return;
    }

    let isMounted = true;
    movieAiApi
      .fetchSimilar(movieId, 12)
      .then((res) => {
        if (isMounted && res.results && res.results.length > 0) {
          setEngineRecs(res.results);
        }
      })
      .catch(() => {
        if (isMounted) setEngineRecs(null);
      });

    return () => {
      isMounted = false;
    };
  }, [movieId]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -400 : 400;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const hasEngineRecs = engineRecs !== null && engineRecs.length > 0;
  if (!hasEngineRecs && movies.length === 0) return null;

  return (
    <section aria-labelledby="similar-movies-heading" className="space-y-4 pt-6">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="similar-movies-heading"
              className="text-xl font-semibold tracking-tight text-white md:text-2xl"
            >
              More Like This
            </h2>
            {hasEngineRecs && (
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-950/40 px-2.5 py-0.5 text-[10px] font-mono text-purple-300">
                <Sparkles size={10} className="text-purple-400" />
                TF-IDF Engine
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {hasEngineRecs
              ? "Matched by TF-IDF plot synopses, genre weights, and director metadata"
              : "Recommended titles sharing genre and cinematic themes"}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="grid h-8 w-8 place-items-center rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="grid h-8 w-8 place-items-center rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label="Similar movies carousel"
        className="no-scrollbar flex items-stretch gap-4 overflow-x-auto pb-4 scroll-smooth"
      >
        {hasEngineRecs
          ? engineRecs.map((rec) => {
              const posterSrc =
                rec.Poster_Web_Path || rec.poster_path || "/poster-fallback.svg";
              const scorePct = Math.round(rec.Similarity_Score * 100);
              const reason = rec.Recommendation_Reasons[0];

              return (
                <Link
                  key={rec.Movie_ID}
                  to="/movie/$movieId"
                  params={{ movieId: String(rec.Movie_ID) }}
                  className="group flex w-40 shrink-0 flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-[#121214] transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/50 hover:shadow-xl hover:shadow-black/70 sm:w-48"
                >
                  {/* Poster Image */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
                    <img
                      src={posterSrc}
                      alt={rec.Title}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/poster-fallback.svg";
                      }}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Match Score Badge */}
                    <span className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/85 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-purple-300 backdrop-blur-md border border-purple-500/40">
                      <span>{scorePct}% Match</span>
                    </span>

                    {rec.Vote_Average !== null && rec.Vote_Average > 0 && (
                      <span className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md border border-zinc-800">
                        <Star size={10} className="fill-amber-400 text-amber-400" />
                        <span>{rec.Vote_Average.toFixed(1)}</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Info */}
                  <div className="flex flex-1 flex-col p-3">
                    <h3 className="line-clamp-1 text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
                      {rec.Title}
                    </h3>
                    <p className="mt-1 text-[10px] text-zinc-400">
                      {rec.Release_Year || "Year N/A"} • {rec.Genres?.split("|")[0] || "Cinema"}
                    </p>
                    {reason && (
                      <p className="mt-2 line-clamp-2 rounded bg-zinc-900/90 p-1.5 text-[9px] text-zinc-300 border border-zinc-800/60 leading-tight">
                        {reason}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })
          : movies.map((m) => {
              const posterSrc = m.posterUrl || "/poster-fallback.svg";
              return (
                <Link
                  key={m.id}
                  to="/movie/$movieId"
                  params={{ movieId: m.id }}
                  className="group flex w-36 shrink-0 flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-[#121214] transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/50 hover:shadow-xl hover:shadow-black/70 sm:w-44"
                >
                  {/* Poster Image */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
                    <img
                      src={posterSrc}
                      alt={m.title}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/poster-fallback.svg";
                      }}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {m.rating !== null && m.rating > 0 && (
                      <span className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md border border-zinc-800">
                        <Star size={10} className="fill-amber-400 text-amber-400" />
                        <span>{m.rating.toFixed(1)}</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Info */}
                  <div className="flex flex-1 flex-col p-2.5">
                    <h3 className="line-clamp-1 text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
                      {m.title}
                    </h3>
                    <p className="mt-1 text-[10px] text-zinc-400">
                      {m.year || "Year N/A"} • {m.genre}
                    </p>
                  </div>
                </Link>
              );
            })}
      </div>
    </section>
  );
}
