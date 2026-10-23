import { useState } from "react";
import { Bookmark, Folder, Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { CollectionItem } from "./types";

interface UserCollectionsProps {
  collections: CollectionItem[];
}

export function UserCollections({ collections }: UserCollectionsProps) {
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [userLiked, setUserLiked] = useState<Record<string, boolean>>({});

  const toggleLike = (id: string, initialCount: number) => {
    setUserLiked((prev) => {
      const isCurrentlyLiked = prev[id] ?? false;
      const nextLiked = !isCurrentlyLiked;
      setLikes((curr) => ({
        ...curr,
        [id]: (curr[id] ?? initialCount) + (nextLiked ? 1 : -1),
      }));
      return { ...prev, [id]: nextLiked };
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#121214] p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold tracking-tight text-white">
          Users' Collections
        </h2>
        <Link
          to="/profile"
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          View all
        </Link>
      </div>

      <div className="space-y-3">
        {collections.map((col) => {
          const currentLikes = likes[col.id] ?? col.likeCount;
          const isLiked = userLiked[col.id] ?? false;

          return (
            <article
              key={col.id}
              className="group flex items-center gap-3.5 rounded-xl border border-zinc-800/80 bg-[#18181A] p-3 transition-colors hover:border-zinc-700 hover:bg-[#1E1E22]"
            >
              {/* Poster collage / thumbnail */}
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800 flex">
                {col.posters.length > 1 ? (
                  <div className="grid grid-cols-2 h-full w-full">
                    {col.posters.slice(0, 4).map((p, i) => (
                      <img
                        key={i}
                        src={p}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ))}
                  </div>
                ) : col.posters.length === 1 ? (
                  <img
                    src={col.posters[0]}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-600">
                    <Folder size={20} />
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
                  {col.title}
                </h3>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  {col.itemCount} Films
                </p>
              </div>

              {/* Like action */}
              <button
                type="button"
                onClick={() => toggleLike(col.id, col.likeCount)}
                aria-label={`Like collection: ${col.title}`}
                className={`flex shrink-0 items-center gap-1 text-xs transition-colors ${
                  isLiked
                    ? "text-rose-500 font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Heart
                  size={14}
                  className={isLiked ? "fill-rose-500 text-rose-500" : ""}
                />
                <span>{currentLikes}</span>
              </button>
            </article>
          );
        })}
      </div>

      <p className="mt-4 border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-500">
        Curated prototype collections based on MOVIEAI catalog recommendations.
      </p>
    </div>
  );
}
