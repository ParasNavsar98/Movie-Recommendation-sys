import { useEffect, useMemo, useState } from "react";
import { useMovieDemo } from "../demo-context";
import { CastCarousel } from "./cast-carousel";
import { CrewSection } from "./crew-section";
import {
  getInitialReviews,
  getMovieCast,
  getMovieCollections,
  getMovieCrew,
  getMovieMeterStats,
  getMovieVibe,
  getSimilarMovies,
} from "./movie-data-adapter";
import { MovieHero } from "./movie-hero";
import { MovieMeter } from "./movie-meter";
import { MovieNav } from "./movie-nav";
import { MovieOverview } from "./movie-overview";
import { ProductionHouse } from "./production-house";
import { ReviewComposer } from "./review-composer";
import { ReviewsFeed } from "./reviews-feed";
import { SimilarMovies } from "./similar-movies";
import type { MovieDetail, UserReview } from "./types";
import { UserCollections } from "./user-collections";
import { VibeChart } from "./vibe-chart";

interface MovieDetailsPageProps {
  movie: MovieDetail;
}

export function MovieDetailsPage({ movie }: MovieDetailsPageProps) {
  const { setLibrary } = useMovieDemo();

  // Keep viewing history updated without resetting scroll or triggering unnecessary updates
  useEffect(() => {
    setLibrary((l) => {
      if (l.history[0] === movie.id) return l;
      return {
        ...l,
        history: [movie.id, ...l.history.filter((x) => x !== movie.id)],
      };
    });
  }, [movie.id, setLibrary]);

  // Derived movie-specific data
  const cast = useMemo(() => getMovieCast(movie.id), [movie.id]);
  const crew = useMemo(() => getMovieCrew(movie), [movie]);
  const vibe = useMemo(() => getMovieVibe(movie), [movie]);
  const meter = useMemo(() => getMovieMeterStats(movie), [movie]);
  const collections = useMemo(() => getMovieCollections(movie), [movie]);
  const similarMovies = useMemo(() => getSimilarMovies(movie, 12), [movie]);

  // Local interactive reviews state (per movie)
  const [reviews, setReviews] = useState<UserReview[]>(() =>
    getInitialReviews(movie.id)
  );

  // Reset reviews when viewing a different movie
  useEffect(() => {
    setReviews(getInitialReviews(movie.id));
  }, [movie.id]);

  const handleAddReview = (newReview: UserReview) => {
    setReviews((prev) => [newReview, ...prev]);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-600 selection:text-white">
      {/* 1. COMPACT GLOBAL NAVIGATION BAR */}
      <MovieNav />

      {/* 2. CINEMATIC HERO SECTION */}
      <MovieHero movie={movie} />

      {/* 3. TWO-COLUMN CONTENT BODY */}
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
          {/* LEFT MAIN COLUMN (~68-70%) */}
          <div className="min-w-0 flex-1 space-y-8 lg:w-[68%]">
            {/* Overview */}
            <MovieOverview movie={movie} />

            <div className="border-t border-zinc-800/80 my-8" />

            {/* Cast Carousel */}
            <CastCarousel cast={cast} />

            <div className="border-t border-zinc-800/80 my-8" />

            {/* Crew Section */}
            <CrewSection crew={crew} />

            <div className="border-t border-zinc-800/80 my-8" />

            {/* Production House */}
            <ProductionHouse studio={movie.studio} />

            <div className="border-t border-zinc-800/80 my-8" />

            {/* MOVIEAI Meter (Four-choice rating gauge) */}
            <MovieMeter meter={meter} movieTitle={movie.title} />

            <div className="border-t border-zinc-800/80 my-8" />

            {/* Write a Review */}
            <ReviewComposer
              movieId={movie.id}
              onAddReview={handleAddReview}
            />

            {/* User Reviews and Discussion Feed */}
            <ReviewsFeed reviews={reviews} />
          </div>

          {/* RIGHT SIDEBAR (~30-32%) */}
          <aside className="w-full shrink-0 space-y-8 lg:w-[32%]">
            {/* Vibe Chart */}
            <VibeChart data={vibe} />

            {/* Users' Collections */}
            <UserCollections collections={collections} />
          </aside>
        </div>

        {/* 4. MORE LIKE THIS RECOMMENDATION CAROUSEL */}
        <div className="mt-14 border-t border-zinc-800/80 pt-8">
          <SimilarMovies movies={similarMovies} movieId={movie.id} />
        </div>
      </main>
    </div>
  );
}
