import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { resolveMovieDetail } from "@/components/movieai/movie-details/movie-data-adapter";
import { MovieDetailsPage } from "@/components/movieai/movie-details/movie-details-page";
import { MovieNotFound } from "@/components/movieai/movie-details/movie-not-found";
import { MovieNav } from "@/components/movieai/movie-details/movie-nav";

export const Route = createFileRoute("/movie/$movieId")({
  head: ({ params }) => {
    const movie = resolveMovieDetail(params.movieId);
    if (!movie) {
      return {
        meta: [
          { title: "Movie Not Found — MOVIEAI" },
          { name: "description", content: "The requested film could not be found." },
        ],
      };
    }

    const titleStr = `${movie.title}${movie.year ? ` (${movie.year})` : ""} — MOVIEAI`;
    return {
      meta: [
        { title: titleStr },
        { name: "description", content: movie.overview },
        { property: "og:title", content: titleStr },
        { property: "og:description", content: movie.overview },
        { property: "og:type", content: "video.movie" },
        ...(movie.posterUrl ? [{ property: "og:image", content: movie.posterUrl }] : []),
      ],
    };
  },
  component: MovieDetailRouteComponent,
});

function MovieDetailRouteComponent() {
  const { movieId } = Route.useParams();
  const movie = useMemo(() => resolveMovieDetail(movieId), [movieId]);

  if (!movie) {
    return (
      <div className="min-h-screen bg-black text-white">
        <MovieNav />
        <MovieNotFound requestedId={movieId} />
      </div>
    );
  }

  return <MovieDetailsPage movie={movie} />;
}
