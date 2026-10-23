import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Bookmark,
  CalendarDays,
  Folder,
  Layers,
  Menu,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useMovieDemo } from "../demo-context";

export function MovieNav({ onSearchClick }: { onSearchClick?: () => void }) {
  const { name, library } = useMovieDemo();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const watchlistCount = library.watchlist.length;
  const collectionsCount = library.collections.length;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/90 bg-[#0B0B0B]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* LEFT: BRANDING */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-white transition-opacity hover:opacity-90"
            aria-label="MOVIEAI Home"
          >
            <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
            <span className="tracking-wider">MOVIEAI</span>
            <span className="text-purple-400">.</span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-5 sm:flex">
            <Link
              to="/explore"
              className="text-xs font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Explore
            </Link>
            <Link
              to="/discover"
              className="text-xs font-medium text-zinc-400 transition-colors hover:text-white"
            >
              For You
            </Link>
          </nav>
        </div>

        {/* RIGHT: COMPACT MONOCHROME UTILITIES */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search Trigger */}
          <Link
            to="/explore"
            aria-label="Search movies"
            title="Search movies"
            className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            <Search size={17} />
          </Link>

          {/* Release Tracker / Calendar */}
          <Link
            to="/explore"
            aria-label="Release calendar"
            title="Release tracker"
            className="hidden sm:grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            <CalendarDays size={17} />
          </Link>

          {/* Watchlist / Bookmark */}
          <Link
            to="/profile"
            aria-label={`Watchlist (${watchlistCount})`}
            title={`Watchlist (${watchlistCount})`}
            className="relative grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            <Bookmark size={17} />
            {watchlistCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-purple-500" />
            )}
          </Link>

          {/* Collections */}
          <Link
            to="/profile"
            aria-label={`Collections (${collectionsCount})`}
            title={`Collections (${collectionsCount})`}
            className="hidden sm:grid relative h-9 w-9 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            <Folder size={17} />
            {collectionsCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-purple-500" />
            )}
          </Link>

          {/* Notifications */}
          <button
            type="button"
            aria-label="Notifications"
            title="No new notifications"
            className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            <Bell size={17} />
          </button>

          {/* User Profile */}
          <Link
            to="/profile"
            aria-label="User profile"
            title={name ? `Profile: ${name}` : "User profile"}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
          >
            {name ? name.slice(0, 2).toUpperCase() : <User size={15} />}
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-white sm:hidden"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN */}
      {mobileMenuOpen && (
        <div className="border-t border-zinc-800 bg-[#0B0B0B] px-4 py-3 sm:hidden">
          <nav className="flex flex-col gap-2">
            <Link
              to="/explore"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
            >
              <Search size={16} />
              Explore Catalogue
            </Link>
            <Link
              to="/discover"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
            >
              <Sparkles size={16} />
              For You / Recommendations
            </Link>
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
            >
              <Bookmark size={16} />
              Watchlist ({watchlistCount})
            </Link>
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
            >
              <Folder size={16} />
              Collections ({collectionsCount})
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
