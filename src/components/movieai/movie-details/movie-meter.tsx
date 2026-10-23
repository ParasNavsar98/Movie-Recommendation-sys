import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { RATING_CATEGORIES } from "./movie-data-adapter";
import type { MovieMeterData, RatingCategory } from "./types";

interface MovieMeterProps {
  meter: MovieMeterData;
  movieTitle: string;
}

export function MovieMeter({ meter, movieTitle }: MovieMeterProps) {
  const [hoveredCategory, setHoveredCategory] = useState<RatingCategory | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${movieTitle} on MOVIEAI`,
          text: `Check out ${movieTitle} on MOVIEAI: ${meter.consensusPct}% consensus score!`,
          url: window.location.href,
        });
        return;
      } catch (err) {
        // User cancelled or unsupported, fallback to clipboard
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const radius = 75;
  const strokeWidth = 14;
  const totalArc = Math.PI * radius; // ~235.6
  const isZeroVotes = meter.totalVotes === 0;

  // Calculate cumulative offsets for semi-circle (Skip -> Timepass -> Go for it -> Perfection)
  const categoryOrder: RatingCategory[] = [
    "skip",
    "timepass",
    "goforit",
    "perfection",
  ];
  let cumulative = 0;
  const segments = categoryOrder.map((catId) => {
    const meta = RATING_CATEGORIES.find((c) => c.id === catId)!;
    const pct = meter.distribution[catId] || 0;
    const arcLen = (pct / 100) * totalArc;
    const offset = cumulative;
    cumulative += arcLen;
    return {
      id: catId,
      meta,
      pct,
      votes: meter.voteCounts[catId] || 0,
      arcLen,
      offset,
    };
  });

  const activeSegment = hoveredCategory
    ? segments.find((s) => s.id === hoveredCategory)
    : null;

  return (
    <section
      aria-labelledby="movie-meter-heading"
      className="rounded-2xl border border-zinc-800 bg-[#121214] p-6 shadow-xl"
    >
      {/* Top Header & Share Action */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            id="movie-meter-heading"
            className="text-lg font-semibold tracking-tight text-white md:text-xl"
          >
            MOVIEAI Meter
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Four-tier community sentiment index
          </p>
        </div>

        <button
          type="button"
          onClick={handleShare}
          aria-label="Share movie rating"
          className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/80 px-3.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800 hover:text-white"
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Share2 size={14} />
              <span>Share</span>
            </>
          )}
        </button>
      </div>

      {isZeroVotes ? (
        <div className="py-8 text-center">
          <p className="text-3xl font-bold text-zinc-500">0%</p>
          <p className="mt-1 text-sm text-zinc-400">0 Total Votes</p>
          <p className="mt-2 text-xs text-zinc-500">
            Be the first to review and set the MOVIEAI consensus!
          </p>
        </div>
      ) : (
        <>
          {/* SEMI-CIRCULAR GAUGE SVG */}
          <div className="relative mx-auto flex max-w-[320px] flex-col items-center justify-center">
            <svg
              viewBox="0 0 200 115"
              className="w-full max-h-[170px]"
              aria-label={`MOVIEAI rating gauge: ${meter.consensusPct}% consensus`}
            >
              {/* Background semi-circle track */}
              <path
                d="M 25 100 A 75 75 0 0 1 175 100"
                fill="none"
                stroke="#222226"
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
              />

              {/* Segmented arcs */}
              {segments.map((seg) => {
                if (seg.pct <= 0) return null;
                const isHovered = hoveredCategory === seg.id;
                return (
                  <path
                    key={seg.id}
                    d="M 25 100 A 75 75 0 0 1 175 100"
                    fill="none"
                    stroke={seg.meta.hex}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={`${seg.arcLen} ${totalArc}`}
                    strokeDashoffset={-seg.offset}
                    className="cursor-pointer transition-all duration-200"
                    style={{
                      opacity:
                        hoveredCategory === null || isHovered ? 1 : 0.45,
                    }}
                    onMouseEnter={() => setHoveredCategory(seg.id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  />
                );
              })}
            </svg>

            {/* Central Score readout */}
            <div className="pointer-events-none -mt-16 text-center">
              {activeSegment ? (
                <>
                  <p
                    className="text-4xl font-extrabold tracking-tight"
                    style={{ color: activeSegment.meta.hex }}
                  >
                    {activeSegment.pct}%
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white">
                    {activeSegment.meta.label}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {activeSegment.votes.toLocaleString()} Votes
                  </p>
                </>
              ) : (
                <>
                  <p className="text-4xl font-extrabold tracking-tight text-white">
                    {meter.consensusPct}%
                  </p>
                  <p className="mt-1 text-xs font-medium text-zinc-300">
                    Consensus Rating
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {meter.positiveVotes.toLocaleString()} /{" "}
                    {meter.totalVotes.toLocaleString()} Positive Votes
                  </p>
                </>
              )}
            </div>
          </div>

          {/* FOUR SENTIMENT LEGEND CARDS */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {segments.map((seg) => {
              const isHovered = hoveredCategory === seg.id;
              return (
                <button
                  key={seg.id}
                  type="button"
                  onMouseEnter={() => setHoveredCategory(seg.id)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onFocus={() => setHoveredCategory(seg.id)}
                  onBlur={() => setHoveredCategory(null)}
                  className={`flex flex-col items-center rounded-xl p-3 text-center transition-all ${
                    isHovered
                      ? "bg-zinc-800/90 ring-1 ring-zinc-600 scale-[1.02]"
                      : "bg-[#18181A] hover:bg-[#202024]"
                  }`}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{ color: seg.meta.hex }}
                  >
                    {seg.meta.label}
                  </span>
                  <span className="mt-1 text-lg font-bold text-white">
                    {seg.pct}%
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {seg.votes.toLocaleString()} votes
                  </span>

                  <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${seg.pct}%`,
                        backgroundColor: seg.meta.hex,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-5 border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-500">
        Consensus combines 'Go for it' and 'Perfection' sentiment shares
        calculated from verified community ratings.
      </p>
    </section>
  );
}
