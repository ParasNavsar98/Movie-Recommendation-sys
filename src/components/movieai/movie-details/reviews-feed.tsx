import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  CornerDownRight,
  Heart,
  MessageSquare,
  MoreVertical,
  Send,
  ShieldAlert,
  User,
} from "lucide-react";
import { RATING_CATEGORIES } from "./movie-data-adapter";
import type { UserReview } from "./types";

interface ReviewsFeedProps {
  reviews: UserReview[];
}

export function ReviewsFeed({ reviews }: ReviewsFeedProps) {
  const [sortBy, setSortBy] = useState<"most_liked" | "newest" | "oldest">(
    "most_liked"
  );
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [followingOnly, setFollowingOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);

  // Interaction states
  const [likedReviews, setLikedReviews] = useState<Record<string, boolean>>({});
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});
  const [expandedText, setExpandedText] = useState<Record<string, boolean>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [repliesList, setRepliesList] = useState<Record<string, string[]>>({});
  const [menuOpen, setMenuOpen] = useState<Record<string, boolean>>({});
  const [copiedReviewId, setCopiedReviewId] = useState<string | null>(null);

  const toggleLike = (id: string) => {
    setLikedReviews((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleSpoiler = (id: string) => {
    setRevealedSpoilers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyReview = async (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopiedReviewId(id);
      setTimeout(() => setCopiedReviewId(null), 2000);
    }
    setMenuOpen((prev) => ({ ...prev, [id]: false }));
  };

  const handleSendReply = (id: string) => {
    const text = replyText[id]?.trim();
    if (!text) return;
    setRepliesList((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), text],
    }));
    setReplyText((prev) => ({ ...prev, [id]: "" }));
    setReplyOpen((prev) => ({ ...prev, [id]: false }));
  };

  // Filter & Sort
  const processedReviews = useMemo(() => {
    let list = [...reviews];

    if (followingOnly) {
      list = list.filter((r) => r.following);
    }

    if (sortBy === "most_liked") {
      list.sort((a, b) => {
        const aLikes = a.likes + (likedReviews[a.id] ? 1 : 0);
        const bLikes = b.likes + (likedReviews[b.id] ? 1 : 0);
        return bLikes - aLikes;
      });
    } else if (sortBy === "newest") {
      list.reverse();
    } else if (sortBy === "oldest") {
      // keep default ordering
    }

    return list;
  }, [reviews, followingOnly, sortBy, likedReviews]);

  const displayedReviews = processedReviews.slice(0, visibleCount);

  return (
    <section aria-labelledby="reviews-section-heading" className="space-y-6 pt-4">
      {/* TOOLBAR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <h2
            id="reviews-section-heading"
            className="text-xl font-semibold tracking-tight text-white md:text-2xl"
          >
            Community Reviews
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {processedReviews.length} opinions shared
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Sort selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "most_liked" | "newest" | "oldest")
              }
              aria-label="Sort reviews"
              className="rounded-lg border border-zinc-800 bg-[#141416] px-3 py-1.5 text-xs font-medium text-zinc-200 outline-none focus:border-purple-500"
            >
              <option value="most_liked">Most Liked</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          {/* Show Spoilers Toggle */}
          <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSpoilers}
              onChange={(e) => setShowSpoilers(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-purple-500"
            />
            <span>Show Spoilers</span>
          </label>

          {/* Following Only Toggle */}
          <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={followingOnly}
              onChange={(e) => setFollowingOnly(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-purple-500"
            />
            <span>Following Only</span>
          </label>
        </div>
      </div>

      {/* REVIEWS LIST */}
      <div className="space-y-4">
        {displayedReviews.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800/80 bg-[#121214] p-8 text-center">
            <p className="text-sm text-zinc-400">
              {followingOnly
                ? "No reviews from users you follow yet. Uncheck 'Following Only' to see all community reactions."
                : "No reviews found for this selection."}
            </p>
          </div>
        ) : (
          displayedReviews.map((rev) => {
            const catMeta = RATING_CATEGORIES.find((c) => c.id === rev.rating)!;
            const isLiked = likedReviews[rev.id] ?? false;
            const likeCount = rev.likes + (isLiked ? 1 : 0);
            const isSpoilerHidden = rev.spoiler && !showSpoilers && !revealedSpoilers[rev.id];
            const isTextLong = rev.content.length > 220;
            const isExpanded = expandedText[rev.id] ?? false;
            const isMenuOpen = menuOpen[rev.id] ?? false;
            const localReplies = repliesList[rev.id] || [];

            return (
              <article
                key={rev.id}
                className="relative rounded-2xl border border-zinc-800/80 bg-[#121214] p-5 transition-colors hover:border-zinc-700/80"
              >
                {/* Header: User avatar, handle, time, and sentiment badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-zinc-200">
                      {rev.avatar || <User size={16} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {rev.author}
                        </span>
                        {rev.following && (
                          <span className="rounded bg-purple-950/60 px-1.5 py-0.5 text-[9px] font-semibold text-purple-300 border border-purple-800/40">
                            Following
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">
                        {rev.handle} • {rev.date}
                      </p>
                    </div>
                  </div>

                  {/* Sentiment Badge */}
                  <div
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: `${catMeta.hex}20`,
                      color: catMeta.hex,
                      border: `1px solid ${catMeta.hex}40`,
                    }}
                  >
                    {catMeta.label}
                  </div>
                </div>

                {/* Review Body */}
                <div className="mt-3.5 text-sm leading-relaxed text-zinc-300">
                  {isSpoilerHidden ? (
                    <button
                      type="button"
                      onClick={() => toggleSpoiler(rev.id)}
                      className="flex w-full items-center gap-2 rounded-xl border border-zinc-800 bg-[#18181A] p-3.5 text-left text-xs font-medium text-amber-400/90 transition-colors hover:border-amber-500/40"
                    >
                      <ShieldAlert size={16} />
                      <span>This review contains spoilers. Click to reveal.</span>
                    </button>
                  ) : (
                    <div>
                      <p>
                        {isTextLong && !isExpanded
                          ? `${rev.content.slice(0, 220)}...`
                          : rev.content}
                      </p>
                      {isTextLong && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedText((prev) => ({
                              ...prev,
                              [rev.id]: !isExpanded,
                            }))
                          }
                          className="mt-1 text-xs font-semibold text-purple-400 hover:text-purple-300"
                        >
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Controls: Like, Reply, Overflow Menu */}
                <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3 text-xs text-zinc-400">
                  <div className="flex items-center gap-4">
                    {/* Like button */}
                    <button
                      type="button"
                      onClick={() => toggleLike(rev.id)}
                      aria-pressed={isLiked}
                      className={`flex items-center gap-1.5 transition-colors ${
                        isLiked
                          ? "text-rose-500 font-semibold"
                          : "hover:text-white"
                      }`}
                    >
                      <Heart
                        size={15}
                        className={isLiked ? "fill-rose-500 text-rose-500" : ""}
                      />
                      <span>{likeCount}</span>
                    </button>

                    {/* Reply trigger */}
                    <button
                      type="button"
                      onClick={() =>
                        setReplyOpen((prev) => ({
                          ...prev,
                          [rev.id]: !prev[rev.id],
                        }))
                      }
                      className="flex items-center gap-1.5 transition-colors hover:text-white"
                    >
                      <MessageSquare size={15} />
                      <span>{rev.replies + localReplies.length}</span>
                    </button>
                  </div>

                  {/* 3-Dot Overflow Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setMenuOpen((prev) => ({
                          ...prev,
                          [rev.id]: !prev[rev.id],
                        }))
                      }
                      aria-label="More options"
                      className="grid h-7 w-7 place-items-center rounded-md hover:bg-zinc-800 hover:text-white"
                    >
                      <MoreVertical size={15} />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 bottom-full mb-1 z-30 w-36 rounded-xl border border-zinc-800 bg-[#1A1A1E] p-1 shadow-2xl">
                        <button
                          type="button"
                          onClick={() => handleCopyReview(rev.id, rev.content)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        >
                          {copiedReviewId === rev.id ? (
                            <>
                              <Check size={13} className="text-green-400" />
                              <span className="text-green-400">Copied!</span>
                            </>
                          ) : (
                            <span>Copy Review</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            alert("Report submitted to moderation queue.");
                            setMenuOpen((prev) => ({ ...prev, [rev.id]: false }));
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-rose-400 hover:bg-zinc-800"
                        >
                          <span>Report</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Local Replies Thread */}
                {localReplies.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-zinc-800/60 pt-3 pl-4">
                    {localReplies.map((reply, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CornerDownRight size={13} className="shrink-0 text-zinc-500 mt-0.5" />
                        <div>
                          <span className="font-semibold text-white">You: </span>
                          <span>{reply}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Reply Composer */}
                {replyOpen[rev.id] && (
                  <div className="mt-3 flex items-center gap-2 border-t border-zinc-800/80 pt-3">
                    <input
                      type="text"
                      value={replyText[rev.id] || ""}
                      onChange={(e) =>
                        setReplyText((prev) => ({
                          ...prev,
                          [rev.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendReply(rev.id);
                      }}
                      placeholder={`Reply to ${rev.author}...`}
                      className="flex-1 rounded-full border border-zinc-800 bg-[#18181A] px-3.5 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendReply(rev.id)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-purple-600 text-white hover:bg-purple-500"
                    >
                      <Send size={13} />
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* PAGINATION / SHOW MORE */}
      {processedReviews.length > visibleCount && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 3)}
            className="flex items-center gap-2 rounded-full border border-zinc-800 bg-[#141416] px-6 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <span>Show More Reviews</span>
            <ChevronDown size={14} />
          </button>
        </div>
      )}
    </section>
  );
}
