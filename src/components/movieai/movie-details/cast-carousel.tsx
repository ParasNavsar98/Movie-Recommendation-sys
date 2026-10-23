import { useRef } from "react";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import type { CastMember } from "./types";

interface CastCarouselProps {
  cast: CastMember[];
}

export function CastCarousel({ cast }: CastCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -240 : 240;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <section aria-labelledby="cast-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          id="cast-heading"
          className="text-xl font-semibold tracking-tight text-white md:text-2xl"
        >
          Cast
        </h2>

        {cast.length > 3 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Scroll cast left"
              className="grid h-8 w-8 place-items-center rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Scroll cast right"
              className="grid h-8 w-8 place-items-center rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {cast.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5 text-center">
          <p className="text-xs text-zinc-400">
            Cast records are currently pending synchronization for this archive entry.
          </p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          tabIndex={0}
          aria-label="Cast members carousel"
          className="no-scrollbar flex items-center gap-6 overflow-x-auto pb-2 scroll-smooth"
        >
          {cast.map((member) => (
            <div
              key={member.id}
              className="flex w-24 shrink-0 flex-col items-center text-center sm:w-28"
            >
              <div className="h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 shadow-md">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-400">
                    <User size={24} />
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs font-semibold text-white truncate w-full">
                {member.name}
              </p>
              <p className="text-[11px] text-zinc-400 truncate w-full">
                {member.character}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
