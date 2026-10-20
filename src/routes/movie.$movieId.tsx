import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, Heart, MessageSquare, Play, Share2, Star, Sparkles, Film, Disc, ShoppingBag, Send, ArrowLeft, Check } from "lucide-react";
import { AuroraBlur } from "@/components/Aurora";
import { Button } from "@/components/ui/button";
import trailer from "@/assets/goodbye_web.webm";
import { movies, type Movie } from "@/components/movieai/discover-data";

export const Route = createFileRoute("/movie/$movieId")({
  head: ({ params }) => {
    const fallback = movies[0]!;
    const movie = movies.find((m) => m.id === params.movieId) ?? fallback;
    return {
      meta: [
        { title: `${movie.title} — MOVIEAI` },
        { name: "description", content: movie.description },
        { property: "og:title", content: `${movie.title} — MOVIEAI` },
        { property: "og:description", content: movie.description },
      ],
    };
  },
  component: MovieDetailsPage,
});

type Review = {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  content: string;
  helpfulCount: number;
};

const defaultReviews: Review[] = [
  {
    id: "r1",
    author: "Elena Vance",
    avatar: "EV",
    rating: 5,
    date: "2 days ago",
    content: "An absolute masterpiece of mood and tension. The sound design alone had me completely immersed from the opening sequence.",
    helpfulCount: 24,
  },
  {
    id: "r2",
    author: "Marcus Thorne",
    avatar: "MT",
    rating: 4,
    date: "1 week ago",
    content: "Stunning visual palette and brilliant performances. MOVIEAI's recommendation hit the mark perfectly for my weekend viewing.",
    helpfulCount: 17,
  },
  {
    id: "r3",
    author: "Sophia Chen",
    avatar: "SC",
    rating: 5,
    date: "2 weeks ago",
    content: "The pacing is deliberate, allowing every emotional beat to resonate deeply. One of the best cinematic experiences this year.",
    helpfulCount: 31,
  },
];

function MovieDetailsPage() {
  const { movieId } = Route.useParams();
  const movie: Movie = movies.find((m) => m.id === movieId) ?? movies[0]!;

  const [inWatchlist, setInWatchlist] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Review form state
  const [newReviewText, setNewReviewText] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [reviews, setReviews] = useState<Review[]>(defaultReviews);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;
    const rev: Review = {
      id: String(Date.now()),
      author: "You (Viewer)",
      avatar: "ME",
      rating: newReviewRating,
      date: "Just now",
      content: newReviewText.trim(),
      helpfulCount: 0,
    };
    setReviews([rev, ...reviews]);
    setNewReviewText("");
  };

  return (
    <div className="cinema relative min-h-screen overflow-hidden bg-[#07090E] text-foreground">
      {/* 1. AURORA BACKGROUND */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <AuroraBlur
          width="100%"
          height="100%"
          speed={1.5}
          noiseScale={3.5}
          movementX={-2}
          movementY={-3}
          verticalFade={0.75}
          bloomIntensity={2}
          brightness={0.8}
          saturation={1}
          opacity={1}
          colorStops={["#00FF9C", "#00C9B7", "#1E1B4B"]}
        />
      </div>

      {/* 2. DARK READABILITY OVERLAY */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[#0B0C10]/50 backdrop-blur-[1px]" />

      {/* 3. MAIN CONTENT LAYER */}
      <div className="relative z-20">
        {/* NAVBAR */}
        <header className="glass sticky top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-10">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <span className="h-3 w-3 bg-primary" /> MOVIEAI<span className="text-signal">.</span>
            </Link>
            <nav className="hidden gap-8 md:flex">
              <Link to="/discover" className="technical text-muted-foreground transition-colors hover:text-foreground">
                Discover
              </Link>
              <a href="#overview" className="technical text-muted-foreground transition-colors hover:text-foreground">
                Overview
              </a>
              <a href="#ratings" className="technical text-muted-foreground transition-colors hover:text-foreground">
                MOVIEAI Ratings
              </a>
              <a href="#reviews" className="technical text-muted-foreground transition-colors hover:text-foreground">
                Reviews
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" size="sm" className="rounded-full border-border/80 bg-background/40 font-mono text-xs uppercase">
                <Link to="/discover">
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Discover
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] space-y-12 px-5 py-8 md:px-10 md:py-12">
          {/* HERO SECTION */}
          <section id="hero" className="notch-card relative overflow-hidden rounded-3xl border border-[#2A2A36]/70 bg-[#1A1A22]/75 p-6 backdrop-blur-md md:p-10">
            <div className="grid gap-8 md:grid-cols-[300px_1fr] lg:grid-cols-[360px_1fr]">
              {/* Poster Column */}
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-muted shadow-2xl">
                <img src={movie.image} alt={movie.title} className="h-full w-full object-cover" />
                <div className="absolute left-3 top-3 rounded-full bg-black/75 px-3 py-1 font-mono text-xs font-semibold backdrop-blur">
                  <Star className="mr-1 inline h-3 w-3 fill-signal text-signal" /> {movie.rating}
                </div>
              </div>

              {/* Info Column */}
              <div className="flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="technical text-primary">◼ Movie Details</span>
                    <span className="technical text-muted-foreground">/ {movie.genre}</span>
                  </div>
                  <h1 className="display mt-3 text-4xl font-bold md:text-6xl lg:text-7xl">{movie.title}</h1>
                  <p className="technical mt-3 text-muted-foreground">
                    {movie.year} · {movie.runtime} · {movie.language} · Directed by {movie.director}
                  </p>
                  <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
                    {movie.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-6">
                  <Button onClick={() => setIsPlaying(!isPlaying)} className="rounded-full px-6">
                    <Play className="mr-2 h-4 w-4" /> {isPlaying ? "Close Trailer" : "Watch Trailer"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setInWatchlist(!inWatchlist)}
                    className={`rounded-full border-[#2A2A36]/70 bg-transparent ${inWatchlist ? "text-primary border-primary" : ""}`}
                  >
                    <Bookmark className={`mr-2 h-4 w-4 ${inWatchlist ? "fill-primary text-primary" : ""}`} />
                    {inWatchlist ? "In Watchlist" : "Watchlist"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`rounded-full border-[#2A2A36]/70 bg-transparent ${isFavorite ? "text-primary border-primary" : ""}`}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${isFavorite ? "fill-primary text-primary" : ""}`} />
                    {isFavorite ? "Favorited" : "Favorite"}
                  </Button>

                  <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-full border border-[#2A2A36]/70 bg-transparent" title="Share link">
                    {copied ? <Check className="h-4 w-4 text-signal" /> : <Share2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Video Player Modal/Section if Playing */}
            {isPlaying && (
              <div className="mt-8 overflow-hidden rounded-2xl border border-border/80 bg-black">
                <video src={trailer} poster={movie.image} autoPlay controls className="aspect-video w-full object-cover" />
              </div>
            )}
          </section>

          {/* MOVIE TAGS */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="technical text-muted-foreground mr-2">Tags & Tone:</span>
            {[movie.genre, movie.language, `${movie.year}`, "Cerebral", "Atmospheric", "Cinematic Sound", "Critically Acclaimed"].map((tag) => (
              <span key={tag} className="technical rounded-full border border-[#2A2A36]/70 bg-[#1A1A22]/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                #{tag.toLowerCase().replace(/\s+/g, "-")}
              </span>
            ))}
          </div>

          {/* DASHBOARD GRID */}
          <div className="grid gap-8 lg:grid-cols-[1.8fr_1fr]">
            {/* LEFT MAIN COLUMN */}
            <section className="space-y-8">
              {/* MovieOverview */}
              <div id="overview" className="rounded-3xl border border-[#2A2A36]/70 bg-[#1A1A22]/75 p-6 backdrop-blur-md md:p-8">
                <div className="flex items-center gap-2 text-primary">
                  <Film className="h-5 w-5" />
                  <h2 className="text-xl font-bold uppercase tracking-wider text-foreground">Synopsis & Overview</h2>
                </div>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  {movie.description} Set against an unforgettable visual landscape, this narrative explores themes of resilience, human connection, and mystery.
                </p>
              </div>

              {/* MovieCrew */}
              <div className="rounded-3xl border border-[#2A2A36]/70 bg-[#1A1A22]/75 p-6 backdrop-blur-md md:p-8">
                <h2 className="text-xl font-bold uppercase tracking-wider text-foreground">Cast & Creative Team</h2>
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-muted/30 p-3">
                    <p className="technical text-xs text-muted-foreground">Director</p>
                    <p className="mt-1 font-semibold text-foreground">{movie.director}</p>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-3">
                    <p className="technical text-xs text-muted-foreground">Language</p>
                    <p className="mt-1 font-semibold text-foreground">{movie.language}</p>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-3">
                    <p className="technical text-xs text-muted-foreground">Runtime</p>
                    <p className="mt-1 font-semibold text-foreground">{movie.runtime}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="technical text-xs text-muted-foreground">Lead Cast</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {movie.cast.map((actor) => (
                      <span key={actor} className="rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-sm font-medium">
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* MovieAIRatings */}
              <div id="ratings" className="rounded-3xl border border-[#2A2A36]/70 bg-[#1A1A22]/75 p-6 backdrop-blur-md md:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="technical text-primary">◼ AI Insights</span>
                    <h2 className="text-2xl font-bold uppercase tracking-wider text-foreground mt-1">MOVIEAI Ratings</h2>
                  </div>
                  <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2 text-center">
                    <span className="block text-2xl font-bold text-primary">96%</span>
                    <span className="technical text-[10px] uppercase text-muted-foreground">Taste Match</span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    ["Visual Aesthetics", 94],
                    ["Narrative Depth", 91],
                    ["Soundtrack & Score", 97],
                    ["Emotional Resonance", 89],
                  ].map(([label, score]) => (
                    <div key={label as string} className="rounded-xl bg-background/40 p-4 border border-border/40">
                      <div className="flex justify-between text-sm font-medium">
                        <span>{label}</span>
                        <span className="technical text-primary">{score}%</span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-gradient-to-r from-primary to-signal" style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* User Rating Controls */}
                <div className="mt-8 border-t border-border/40 pt-6">
                  <p className="technical text-sm text-muted-foreground">Your Personal Rating for {movie.title}:</p>
                  <div className="mt-3 flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setUserRating(star)}
                        aria-label={`Rate ${star} stars`}
                        className="transition-transform hover:scale-110"
                      >
                        <Star className={`h-8 w-8 ${star <= userRating ? "fill-signal text-signal" : "text-muted-foreground/40 hover:text-foreground"}`} />
                      </button>
                    ))}
                    {userRating > 0 && <span className="ml-3 technical text-signal font-semibold">{userRating} / 5 Stars</span>}
                  </div>
                </div>
              </div>

              {/* MovieReviewForm */}
              <div className="rounded-3xl border border-[#2A2A36]/70 bg-[#1A1A22]/75 p-6 backdrop-blur-md md:p-8">
                <h3 className="text-lg font-bold uppercase text-foreground">Write a Review</h3>
                <form onSubmit={handleAddReview} className="mt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="technical text-xs text-muted-foreground">Rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setNewReviewRating(star)}>
                          <Star className={`h-5 w-5 ${star <= newReviewRating ? "fill-signal text-signal" : "text-muted-foreground/40"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder="Share your thoughts on the cinematography, story, or performances..."
                    className="w-full rounded-2xl border border-border/60 bg-background/50 p-4 text-sm outline-none focus:border-primary placeholder:text-muted-foreground/60"
                  />
                  <Button type="submit" size="sm" className="rounded-full px-6">
                    <Send className="mr-2 h-3.5 w-3.5" /> Submit Review
                  </Button>
                </form>
              </div>
            </section>

            {/* RIGHT ASIDE COLUMN */}
            <aside className="space-y-8">
              {/* MovieVibeChart */}
              <div className="rounded-3xl border border-[#2A2A36]/70 bg-[#1A1A22]/75 p-6 backdrop-blur-md md:p-8">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-signal" />
                  <h3 className="text-lg font-bold uppercase tracking-wider text-foreground">Vibe Spectrum</h3>
                </div>
                <div className="mt-6 space-y-4">
                  {[
                    ["Wonder", 88],
                    ["Intensity", 72],
                    ["Melancholy", 64],
                    ["Ethereal", 95],
                  ].map(([vibe, val]) => (
                    <div key={vibe as string} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-muted-foreground">{vibe}</span>
                        <span className="text-primary">{val}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div className="h-full rounded-full bg-signal opacity-80" style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MovieMerchCard */}
              <div className="notch-card rounded-3xl border border-[#2A2A36]/70 bg-[#1A1A22]/75 p-6 backdrop-blur-md md:p-8">
                <div className="flex items-center gap-2 text-primary">
                  <Disc className="h-5 w-5" />
                  <span className="technical text-xs font-bold uppercase">Official Merchandise</span>
                </div>
                <h3 className="mt-3 text-xl font-bold">{movie.title} Original Soundtrack Vinyl</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Collector's double 180g aurora-cyan vinyl including original score and exclusive art print.
                </p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-lg font-bold">$34.99</span>
                  <Button size="sm" variant="outline" className="rounded-full border-border bg-background/50">
                    <ShoppingBag className="mr-1.5 h-3.5 w-3.5" /> Order Edition
                  </Button>
                </div>
              </div>
            </aside>
          </div>

          {/* MOVIE REVIEW FEED */}
          <section id="reviews" className="rounded-3xl border border-[#2A2A36]/70 bg-[#1A1A22]/75 p-6 backdrop-blur-md md:p-8">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold uppercase tracking-wider text-foreground">Viewer Reviews ({reviews.length})</h2>
            </div>

            <div className="mt-6 space-y-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="rounded-2xl border border-border/50 bg-background/40 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 font-mono text-xs font-bold text-primary">
                        {rev.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{rev.author}</p>
                        <p className="technical text-xs text-muted-foreground">{rev.date}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`h-4 w-4 ${star <= rev.rating ? "fill-signal text-signal" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{rev.content}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
