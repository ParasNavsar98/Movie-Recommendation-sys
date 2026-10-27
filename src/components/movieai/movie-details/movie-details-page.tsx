import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { movieAiApi, ApiError, type MovieReviewItem, type MovieReviewSummary } from "@/lib/api-client";
import { formatRelativeTime, resolveMovieNumericId } from "@/lib/utils";
import { useMovieDemo } from "../demo-context";
import { CastCarousel } from "./cast-carousel";
import { CrewSection } from "./crew-section";
import {
  getMovieCast,
  getMovieCollections,
  getMovieCrew,
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
import type { MovieDetail, MovieMeterData, UserReview } from "./types";
import { UserCollections } from "./user-collections";
import { VibeChart } from "./vibe-chart";

interface MovieDetailsPageProps {
  movie: MovieDetail;
}

function mapReviewItemToUserReview(
  item: MovieReviewItem,
  currentUserId?: string
): UserReview {
  return {
    id: item.review_id,
    author: item.author,
    handle: item.handle,
    avatar: item.avatar,
    date: formatRelativeTime(item.created_at),
    rating: item.sentiment,
    stars: item.rating,
    content: item.content,
    likes: item.likes_count,
    replies: 0,
    spoiler: item.is_spoiler,
    following: true,
    userLiked: item.user_liked,
    isOwnReview: Boolean(currentUserId && item.user_id === currentUserId),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export function MovieDetailsPage({ movie }: MovieDetailsPageProps) {
  const { user, setLibrary } = useMovieDemo();
  const composerRef = useRef<HTMLDivElement>(null);

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

  // Derived movie-specific static catalogue data
  const cast = useMemo(() => getMovieCast(movie.id), [movie.id]);
  const crew = useMemo(() => getMovieCrew(movie), [movie]);
  const vibe = useMemo(() => getMovieVibe(movie), [movie]);
  const collections = useMemo(() => getMovieCollections(movie), [movie]);
  const similarMovies = useMemo(() => getSimilarMovies(movie, 12), [movie]);

  const numMovieId = useMemo(
    () => resolveMovieNumericId(movie.id),
    [movie.id]
  );

  // Live database review states
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [summary, setSummary] = useState<MovieReviewSummary | null>(null);
  const [myReview, setMyReview] = useState<UserReview | null>(null);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const currentUserId = user?.user_id || (user as any)?.id;

  const fetchReviewsData = useCallback(async () => {
    setLoadingReviews(true);
    setReviewsError(null);

    try {
      // 1. Fetch public reviews list and summary in parallel
      const [reviewsRes, summaryRes] = await Promise.all([
        movieAiApi.getMovieReviews(numMovieId, { limit: 50, sort_by: "newest" }),
        movieAiApi.getMovieReviewSummary(numMovieId),
      ]);

      const mappedReviews = reviewsRes.reviews.map((r) =>
        mapReviewItemToUserReview(r, currentUserId)
      );

      setReviews(mappedReviews);
      setSummary(summaryRes);

      // 2. Fetch authenticated user's own review if logged in
      if (currentUserId && movieAiApi.isAuthenticated()) {
        try {
          const myReviewRes = await movieAiApi.getMyMovieReview(numMovieId);
          if (myReviewRes.review) {
            const mappedMy = mapReviewItemToUserReview(
              myReviewRes.review,
              currentUserId
            );
            mappedMy.isOwnReview = true;
            setMyReview(mappedMy);

            // Ensure own review is marked in the list as well
            setReviews((prev) =>
              prev.map((r) =>
                r.id === mappedMy.id ? { ...r, isOwnReview: true } : r
              )
            );
          } else {
            setMyReview(null);
          }
        } catch {
          // Ignore /me fetch failure if unauthorized or token expired
          setMyReview(null);
        }
      } else {
        setMyReview(null);
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Unable to load reviews from database. Please check your connection.";
      setReviewsError(msg);
    } finally {
      setLoadingReviews(false);
    }
  }, [numMovieId, currentUserId]);

  useEffect(() => {
    fetchReviewsData();
  }, [fetchReviewsData]);

  // Dynamic MovieMeter data calculated from authoritative summary
  const meter: MovieMeterData = useMemo(() => {
    const total = summary?.total_votes ?? summary?.total_reviews ?? 0;
    if (summary && total > 0) {
      return {
        consensusPct: summary.consensus_pct ?? 0,
        totalVotes: total,
        positiveVotes: summary.positive_votes ?? summary.positive_reviews ?? 0,
        averageRating: summary.average_rating ?? 0,
        distribution: summary.distribution ?? summary.sentiment_percentages ?? {
          skip: 0,
          timepass: 0,
          goforit: 0,
          perfection: 0,
        },
        voteCounts: summary.vote_counts ?? summary.sentiment_distribution ?? {
          skip: 0,
          timepass: 0,
          goforit: 0,
          perfection: 0,
        },
        ratingDistribution: summary.rating_distribution ?? {},
      };
    }
    return {
      consensusPct: 0,
      totalVotes: 0,
      positiveVotes: 0,
      averageRating: 0,
      distribution: { skip: 0, timepass: 0, goforit: 0, perfection: 0 },
      voteCounts: { skip: 0, timepass: 0, goforit: 0, perfection: 0 },
      ratingDistribution: {},
    };
  }, [summary]);

  const handleReviewSaved = useCallback(
    async (savedReview: UserReview) => {
      setMyReview(savedReview);

      // Upsert into reviews list
      setReviews((prev) => {
        const index = prev.findIndex((r) => r.id === savedReview.id);
        if (index >= 0) {
          const copy = [...prev];
          copy[index] = savedReview;
          return copy;
        }
        return [savedReview, ...prev];
      });

      // Refetch authoritative summary from database so MovieMeter updates accurately
      try {
        const freshSummary = await movieAiApi.getMovieReviewSummary(numMovieId);
        setSummary(freshSummary);
      } catch {
        // Fallback: local recalculation if summary endpoint fails
      }
    },
    [numMovieId]
  );

  const handleReviewDeleted = useCallback(
    async (reviewId: string) => {
      setMyReview(null);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));

      try {
        const freshSummary = await movieAiApi.getMovieReviewSummary(numMovieId);
        setSummary(freshSummary);
      } catch {
        // Fallback: summary refresh
      }
    },
    [numMovieId]
  );

  const handleLikeReview = useCallback(
    async (reviewId: string) => {
      const res = await movieAiApi.toggleReviewLike(numMovieId, reviewId);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, likes: res.likes_count, userLiked: res.liked }
            : r
        )
      );
    },
    [numMovieId]
  );

  const handleEditFromFeed = useCallback((review: UserReview) => {
    setMyReview(review);
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

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

            {/* MOVIEAI Meter (Data-driven community sentiment index & gauge) */}
            <MovieMeter
              meter={meter}
              movieTitle={movie.title}
              isLoading={loadingReviews}
              error={reviewsError}
              onRetry={fetchReviewsData}
            />

            <div className="border-t border-zinc-800/80 my-8" />

            {/* Write / Edit a Review */}
            <div ref={composerRef}>
              <ReviewComposer
                movieId={movie.id}
                movieTitle={movie.title}
                existingReview={myReview}
                onReviewSaved={handleReviewSaved}
                onReviewDeleted={handleReviewDeleted}
              />
            </div>

            {/* User Reviews and Discussion Feed */}
            <ReviewsFeed
              reviews={reviews}
              isLoading={loadingReviews}
              error={reviewsError}
              onRetry={fetchReviewsData}
              onEditReview={handleEditFromFeed}
              onDeleteReview={handleReviewDeleted}
              onLikeReview={handleLikeReview}
            />
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
