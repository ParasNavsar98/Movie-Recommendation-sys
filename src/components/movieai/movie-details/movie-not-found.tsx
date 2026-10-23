import { Link } from "@tanstack/react-router";
import { Film, Search, XCircle } from "lucide-react";

export function MovieNotFound({ requestedId }: { requestedId?: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-black px-4 py-16 text-center text-white">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-rose-500 mb-6">
        <XCircle size={32} />
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        Film Not Found
      </h1>
      <p className="mt-3 max-w-md text-sm text-zinc-400">
        We couldn't locate a verified movie record for ID{" "}
        {requestedId ? (
          <code className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-200">
            {requestedId}
          </code>
        ) : (
          "provided"
        )}
        . The link may have changed or the title is no longer in this catalogue snapshot.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/explore"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-purple-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-purple-500"
        >
          <Search size={16} />
          <span>Explore 4,800+ Movies</span>
        </Link>
        <Link
          to="/discover"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-6 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <Film size={16} />
          <span>For You Recommendations</span>
        </Link>
      </div>
    </div>
  );
}
