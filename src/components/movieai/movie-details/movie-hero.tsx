import { useState } from "react";
import { Bookmark, Check, FolderPlus, Heart, Play, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMovieDemo } from "../demo-context";
import { TrailerPlayer } from "./trailer-player";
import type { MovieDetail } from "./types";

interface MovieHeroProps {
  movie: MovieDetail;
}

export function MovieHero({ movie }: MovieHeroProps) {
  const {
    library,
    setLibrary,
    toggleLike,
    toggleDislike,
    toggleFavorite,
    toggleWatchlist,
    recordWatched,
    rateMovie,
  } = useMovieDemo();
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [collectionToast, setCollectionToast] = useState(false);

  const isWatched = library.watched.includes(movie.id);
  const isWatchLater = library.watchlist.includes(movie.id);
  const isInCollection = library.collections.includes(movie.id);
  const isLiked = library.reactions[movie.id] === "like";
  const isDisliked = library.reactions[movie.id] === "dislike";
  const isFavorited = library.favorites.includes(movie.id);
  const currentRating = library.ratings[movie.id] || 0;

  const handleToggleWatched = () => {
    recordWatched(movie.id);
  };

  const handleToggleWatchlist = () => {
    toggleWatchlist(movie.id);
  };

  const handleToggleLike = () => {
    toggleLike(movie.id);
  };

  const handleToggleDislike = () => {
    toggleDislike(movie.id);
  };

  const handleToggleFavorite = () => {
    toggleFavorite(movie.id);
  };

  const handleRate = (stars: number) => {
    const next = currentRating === stars ? 0 : stars;
    rateMovie(movie.id, next);
  };

  const toggleCollection = () => {
    setLibrary((prev) => ({
      ...prev,
      collections: prev.collections.includes(movie.id)
        ? prev.collections.filter((id) => id !== movie.id)
        : [...prev.collections, movie.id],
    }));
    setCollectionToast(true);
    setTimeout(() => setCollectionToast(false), 2400);
  };

  const posterSrc =
    !posterError && movie.posterUrl ? movie.posterUrl : "/poster-fallback.svg";

  return (
    <div className="relative w-full bg-black">
      {/* 1. HERO BACKDROP REGION */}
      <div className="relative h-[380px] w-full overflow-hidden bg-[#0A0A0A] sm:h-[460px] md:h-[540px] lg:h-[600px]">
        {isPlayingTrailer ? (
          <TrailerPlayer
            trailerUrl={movie.trailerUrl}
            posterUrl={posterSrc}
            title={movie.title}
            onClose={() => setIsPlayingTrailer(false)}
          />
        ) : (
          <>
            {/* Cinematic Backdrop Image */}
            <div className="absolute inset-0">
              <img
                src={posterSrc}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover object-center filter blur-md scale-105 brightness-50"
              />
              {/* Natural Dark cinematic gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80" />
            </div>

            {/* Center Play Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setIsPlayingTrailer(true)}
                aria-label={`Play trailer for ${movie.title}`}
                className="group relative flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-white/60 hover:bg-black/70 sm:h-24 sm:w-24"
              >
                <div className="absolute inset-0 rounded-full bg-purple-600/20 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
                <Play
                  size={32}
                  className="ml-1.5 fill-white text-white transition-transform group-hover:scale-105 sm:size-9"
                />
              </button>
            </div>
          </>
        )}
      </div>

      {/* 2. FLOATING POSTER & METADATA SECTION */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-24 sm:-mt-32 md:-mt-40 z-20 flex flex-col gap-6 md:flex-row md:items-end md:gap-10">
          {/* Floating Poster Card */}
          <div className="w-40 sm:w-52 md:w-64 shrink-0">
            <div className="aspect-[2/3] w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#141416] shadow-2xl shadow-black/90">
              <img
                src={posterSrc}
                alt={`${movie.title} poster`}
                onError={() => setPosterError(true)}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Title & Metadata Column */}
          <div className="flex-1 pb-2">
            {/* Top Info Bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-400">
              <span className="uppercase tracking-wider">Movie</span>
              {movie.year && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{movie.year}</span>
                </>
              )}
              {movie.runtimeFormatted && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{movie.runtimeFormatted}</span>
                </>
              )}
              {movie.ageRating && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-300">
                    {movie.ageRating}
                  </span>
                </>
              )}
            </div>

            {/* Movie Title */}
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
              {movie.title}
            </h1>

            {/* Compact Metadata Grid */}
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-8 text-xs">
              <div>
                <span className="text-zinc-500 uppercase tracking-wider block text-[10px]">
                  Director
                </span>
                <span className="font-medium text-zinc-200 mt-0.5 block truncate max-w-[200px]">
                  {movie.director}
                </span>
              </div>
              {movie.country && (
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block text-[10px]">
                    Country
                  </span>
                  <span className="font-medium text-zinc-200 mt-0.5 block">
                    {movie.country}
                  </span>
                </div>
              )}
              {movie.language && (
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block text-[10px]">
                    Language
                  </span>
                  <span className="font-medium text-zinc-200 mt-0.5 block">
                    {movie.language}
                  </span>
                </div>
              )}
              {movie.studio && (
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block text-[10px]">
                    Studio
                  </span>
                  <span className="font-medium text-zinc-200 mt-0.5 block truncate max-w-[220px]">
                    {movie.studio}
                  </span>
                </div>
              )}
            </div>

            {/* Hero Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {/* Mark as Watched (Wide purple pill) */}
              <button
                type="button"
                onClick={handleToggleWatched}
                aria-pressed={isWatched}
                className={`inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold transition-all ${
                  isWatched
                    ? "bg-purple-700 text-white shadow-lg shadow-purple-900/40"
                    : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                }`}
              >
                <Check
                  size={17}
                  className={`transition-transform ${isWatched ? "scale-110" : ""}`}
                />
                <span>{isWatched ? "Watched" : "Mark as Watched"}</span>
              </button>

              {/* Like Button */}
              <button
                type="button"
                onClick={handleToggleLike}
                aria-label={isLiked ? "Unlike movie" : "Like movie"}
                aria-pressed={isLiked}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                  isLiked
                    ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200"
                }`}
              >
                <ThumbsUp size={16} className={isLiked ? "fill-emerald-400 text-emerald-400" : ""} />
                <span>{isLiked ? "Liked" : "Like"}</span>
              </button>

              {/* Dislike Button */}
              <button
                type="button"
                onClick={handleToggleDislike}
                aria-label={isDisliked ? "Undislike movie" : "Dislike movie"}
                aria-pressed={isDisliked}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                  isDisliked
                    ? "border-rose-500/60 bg-rose-950/40 text-rose-300"
                    : "border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200"
                }`}
              >
                <ThumbsDown size={16} className={isDisliked ? "fill-rose-400 text-rose-400" : ""} />
                <span>{isDisliked ? "Disliked" : "Dislike"}</span>
              </button>

              {/* Favorite Button */}
              <button
                type="button"
                onClick={handleToggleFavorite}
                aria-label={isFavorited ? "Remove favorite" : "Favorite movie"}
                aria-pressed={isFavorited}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                  isFavorited
                    ? "border-rose-500/60 bg-rose-950/40 text-rose-300"
                    : "border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200"
                }`}
              >
                <Heart size={16} className={isFavorited ? "fill-rose-500 text-rose-500" : ""} />
                <span>{isFavorited ? "Favorited" : "Favorite"}</span>
              </button>

              {/* Collections Button */}
              <button
                type="button"
                onClick={toggleCollection}
                aria-pressed={isInCollection}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-medium transition-colors ${
                  isInCollection
                    ? "border-purple-500/60 bg-purple-950/30 text-purple-300"
                    : "border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200"
                }`}
              >
                <FolderPlus size={16} />
                <span>{isInCollection ? "In Collection" : "Collections"}</span>
              </button>

              {/* Watch Later Button */}
              <button
                type="button"
                onClick={handleToggleWatchlist}
                aria-pressed={isWatchLater}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-medium transition-colors ${
                  isWatchLater
                    ? "border-zinc-600 bg-zinc-800 text-white"
                    : "border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200"
                }`}
              >
                <Bookmark
                  size={16}
                  className={isWatchLater ? "fill-white text-white" : ""}
                />
                <span>{isWatchLater ? "In Watchlist" : "Watch Later"}</span>
              </button>
            </div>

            {/* Quick Star Rating Bar */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs text-zinc-400">Your Rating:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRate(star)}
                    aria-label={`Rate ${star} out of 5 stars`}
                    className="p-1 text-zinc-400 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      size={18}
                      className={
                        star <= currentRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-zinc-600"
                      }
                    />
                  </button>
                ))}
              </div>
              {currentRating > 0 && (
                <span className="text-xs font-mono text-amber-400">
                  {currentRating} / 5 Stars
                </span>
              )}
            </div>

            {/* Temporary feedback notice */}
            {collectionToast && (
              <p className="mt-2 text-xs text-purple-400">
                {isInCollection
                  ? "Added to your personal prototype collection."
                  : "Removed from personal collection."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
