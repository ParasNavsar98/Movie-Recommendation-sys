import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { MovieDetail } from "./types";

interface MovieOverviewProps {
  movie: MovieDetail;
}

export function MovieOverview({ movie }: MovieOverviewProps) {
  const [expanded, setExpanded] = useState(false);
  const isLongText = movie.overview.length > 280;

  return (
    <section aria-labelledby="overview-heading" className="space-y-4">
      <h2
        id="overview-heading"
        className="text-xl font-semibold tracking-tight text-white md:text-2xl"
      >
        Overview
      </h2>

      {/* Genre Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {movie.genres.map((genre) => (
          <Link
            key={genre}
            to="/explore"
            className="rounded-full border border-zinc-800 bg-zinc-900/90 px-4 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            {genre}
          </Link>
        ))}
      </div>

      {/* Synopsis Text */}
      <div className="text-sm leading-relaxed text-zinc-300 md:text-base md:leading-relaxed">
        <p>
          {isLongText && !expanded
            ? `${movie.overview.slice(0, 280)}...`
            : movie.overview}
        </p>

        {isLongText && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300"
          >
            {expanded ? (
              <>
                <span>Show less</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>Read more</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
