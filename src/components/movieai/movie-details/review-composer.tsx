import { useState } from "react";
import { Check, User } from "lucide-react";
import { useMovieDemo } from "../demo-context";
import { RATING_CATEGORIES } from "./movie-data-adapter";
import type { RatingCategory, UserReview } from "./types";

interface ReviewComposerProps {
  movieId: string;
  onAddReview: (review: UserReview) => void;
}

export function ReviewComposer({ movieId, onAddReview }: ReviewComposerProps) {
  const { name } = useMovieDemo();
  const [selectedSentiment, setSelectedSentiment] =
    useState<RatingCategory | null>(null);
  const [content, setContent] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handle = `@${
    name ? name.toLowerCase().replace(/\s+/g, "") : "guest_viewer"
  }`;
  const authorName = name || "Guest Viewer";
  const initials = authorName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !selectedSentiment) return;

    const newReview: UserReview = {
      id: `user-rev-${Date.now()}`,
      author: authorName,
      handle,
      avatar: initials,
      date: "Just now",
      rating: selectedSentiment,
      content: content.trim(),
      likes: 0,
      replies: 0,
      following: true,
      spoiler: isSpoiler,
      userLiked: false,
    };

    onAddReview(newReview);
    setContent("");
    setSelectedSentiment(null);
    setIsSpoiler(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const remainingChars = 1000 - content.length;
  const isFormValid = content.trim().length > 0 && selectedSentiment !== null;

  return (
    <section
      aria-labelledby="write-review-heading"
      className="rounded-2xl border border-zinc-800 bg-[#121214] p-6 shadow-xl"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        {/* User Info Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-white">
            {initials ? initials : <User size={16} />}
          </div>
          <div>
            <h2
              id="write-review-heading"
              className="text-sm font-semibold text-white"
            >
              Write a Review
            </h2>
            <p className="text-xs text-zinc-400">{handle}</p>
          </div>
        </div>

        {/* Four Sentiment Selector Buttons */}
        <div
          role="radiogroup"
          aria-label="Select movie sentiment"
          className="flex flex-wrap items-center gap-1.5"
        >
          {RATING_CATEGORIES.map((cat) => {
            const isSelected = selectedSentiment === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() =>
                  setSelectedSentiment(isSelected ? null : cat.id)
                }
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "text-black shadow-md"
                    : "border border-zinc-700/80 bg-zinc-900/80 text-zinc-300 hover:border-zinc-500 hover:text-white"
                }`}
                style={
                  isSelected
                    ? { backgroundColor: cat.hex, color: "#000000" }
                    : undefined
                }
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {submitted && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-950/20 px-4 py-2 text-xs text-green-300">
          <Check size={15} />
          <span>Your review has been posted to this session's feed!</span>
        </div>
      )}

      {/* Review Form */}
      <form onSubmit={handlePost}>
        <div className="relative">
          <textarea
            value={content}
            maxLength={1000}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Share your thoughts about this movie..."
            aria-label="Review content"
            className="w-full resize-none rounded-xl border border-zinc-800 bg-[#18181A] p-4 text-sm text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/80"
          />

          <span
            className={`absolute bottom-3 right-4 text-[11px] font-medium ${
              remainingChars < 50 ? "text-amber-400" : "text-zinc-500"
            }`}
          >
            {content.length} / 1000
          </span>
        </div>

        {/* Footer controls */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isSpoiler}
              onChange={(e) => setIsSpoiler(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-purple-500"
            />
            <span>Contains spoilers</span>
          </label>

          <div className="flex items-center gap-3">
            {!selectedSentiment && content.length > 0 && (
              <span className="text-xs text-zinc-400">
                Please pick a sentiment above to post.
              </span>
            )}
            <button
              type="submit"
              disabled={!isFormValid}
              className="inline-flex h-9 items-center justify-center rounded-full bg-purple-600 px-6 text-xs font-semibold text-white transition-opacity hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600"
            >
              Post Review
            </button>
          </div>
        </div>
      </form>

      <p className="mt-4 border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-500">
        Demo preview — reviews are stored locally in your session.
      </p>
    </section>
  );
}
