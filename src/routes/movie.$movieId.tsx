import { createFileRoute, notFound } from "@tanstack/react-router";
import { movies } from "@/components/movieai/discover-data";
import { MovieDetailsPage, MovieNotFound } from "@/components/movieai/movie-details/movie-details-page";

export const Route = createFileRoute("/movie/$movieId")({
  loader: ({ params }) => {
    const movie = movies.find((m) => m.id === params.movieId);
    if (!movie) throw notFound();
    return { movie };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Movie not found — MOVIEAI" }, { name: "robots", content: "noindex" }] };
    const { movie } = loaderData;
    const title = `${movie.title} (${movie.year}) — MOVIEAI`;
    return { meta: [
      { title },
      { name: "description", content: movie.description },
      { property: "og:title", content: title },
      { property: "og:description", content: movie.description },
      { property: "og:type", content: "video.movie" },
      { name: "twitter:card", content: "summary_large_image" },
    ] };
  },
  notFoundComponent: MovieNotFound,
  component: MovieRoute,
});

function MovieRoute() {
  const { movie } = Route.useLoaderData();
  return <MovieDetailsPage movie={movie} />;
}
