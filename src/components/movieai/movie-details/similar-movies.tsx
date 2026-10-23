import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { CatalogueMovie } from "@/data/catalogue-data";

interface SimilarMoviesProps {
  movies: CatalogueMovie[];
}

export function SimilarMovies({ movies }: SimilarMoviesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -400 : 400;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  if (movies.length === 0) return null;

  return (
    <section aria-labelledby="similar-movies-heading" className="space-y-4 pt-6">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div>
          <h2
            id="similar-movies-heading"
            className="text-xl font-semibold tracking-tight text-white md:text-2xl"
          >
            More Like This
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Recommended titles sharing genre and cinematic themes
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
        {movies.map((m) => {
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
