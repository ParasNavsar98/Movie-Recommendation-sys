import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import { movieAiApi } from "@/lib/api-client";

export type Reaction = "like" | "dislike";
export type Library = {
  reactions: Record<string, Reaction>;
  ratings: Record<string, number>;
  favorites: string[];
  watchlist: string[];
  history: string[];
  watched: string[];
  collections: string[];
};

export const initialLibrary: Library = {
  reactions: {},
  ratings: {},
  favorites: [],
  watchlist: [],
  history: [],
  watched: [],
  collections: [],
};

const LOCAL_STORAGE_KEY = "movieai_user_library_v2";
const LOCAL_STORAGE_GENRES_KEY = "movieai_user_genres_v2";

type DemoState = {
  name: string;
  email: string;
  selected: string[];
  genres: string[];
  backendStatus: "checking" | "online" | "offline";
  syncCounter: number;
  setName: (value: string) => void;
  setEmail: (value: string) => void;
  setSelected: (value: string[]) => void;
  setGenres: (value: string[]) => void;
  reset: () => void;
  library: Library;
  setLibrary: (fn: (l: Library) => Library) => void;
  toggleLike: (id: string) => Promise<void>;
  toggleDislike: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleWatchlist: (id: string) => Promise<void>;
  rateMovie: (id: string, stars: number) => Promise<void>;
  recordWatched: (id: string) => Promise<void>;
  refreshBackendState: () => Promise<void>;
};

const DemoContext = createContext<DemoState | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  // Load initial cached library from localStorage if available
  const [library, setLib] = useState<Library>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return initialLibrary;
  });

  const [genres, setGenresState] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_GENRES_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [];
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [syncCounter, setSyncCounter] = useState(0);

  // Persist library changes to localStorage
  const setLibrary = useCallback((fn: (l: Library) => Library) => {
    setLib((current) => {
      const next = fn(current);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
    setSyncCounter((c) => c + 1);
  }, []);

  const setGenres = useCallback((newGenres: string[]) => {
    setGenresState(newGenres);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_GENRES_KEY, JSON.stringify(newGenres));
      } catch {
        // ignore
      }
    }
    // Sync to backend asynchronously
    movieAiApi.updateProfile({ favorite_genres: newGenres }).catch(() => {});
    setSyncCounter((c) => c + 1);
  }, []);

  // Fetch full user state from backend SQLite store on startup
  const refreshBackendState = useCallback(async () => {
    try {
      const health = await movieAiApi.checkHealth();
      if (!health.ready) {
        setBackendStatus("offline");
        return;
      }
      setBackendStatus("online");

      const profile = await movieAiApi.fetchProfile();
      if (profile) {
        if (profile.name) setName(profile.name);
        if (profile.email) setEmail(profile.email);
        if (profile.favorite_genres && profile.favorite_genres.length > 0) {
          setGenresState(profile.favorite_genres);
        }

        // Merge backend persistence into library
        setLib((prev) => {
          const reactions: Record<string, Reaction> = { ...prev.reactions };
          profile.likes.forEach((id) => {
            reactions[String(id)] = "like";
          });
          profile.dislikes.forEach((id) => {
            reactions[String(id)] = "dislike";
          });

          const ratings: Record<string, number> = { ...prev.ratings };
          Object.entries(profile.ratings).forEach(([id, val]) => {
            ratings[id] = val;
          });

          const favorites = Array.from(
            new Set([...prev.favorites, ...profile.favorites.map(String)])
          );
          const watchlist = Array.from(
            new Set([...prev.watchlist, ...profile.watchlist.map(String)])
          );
          const watched = Array.from(
            new Set([...prev.watched, ...profile.watched.map(String)])
          );
          const history = Array.from(
            new Set([...prev.history, ...profile.history.map(String)])
          );

          const merged: Library = {
            ...prev,
            reactions,
            ratings,
            favorites,
            watchlist,
            watched,
            history,
          };

          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
            } catch {
              // ignore
            }
          }
          return merged;
        });
      }
    } catch {
      setBackendStatus("offline");
    }
  }, []);

  useEffect(() => {
    refreshBackendState();
  }, [refreshBackendState]);

  // Action methods with optimistic updates and backend persistence
  const toggleLike = useCallback(
    async (id: string) => {
      const isNum = !isNaN(Number(id));
      setLibrary((prev) => {
        const nextReactions = { ...prev.reactions };
        const current = nextReactions[id];
        if (current === "like") {
          delete nextReactions[id];
        } else {
          nextReactions[id] = "like";
        }
        return { ...prev, reactions: nextReactions };
      });

      if (isNum) {
        try {
          await movieAiApi.toggleLike(id);
          setBackendStatus("online");
        } catch {
          // Keep local state intact
        }
      }
    },
    [setLibrary]
  );

  const toggleDislike = useCallback(
    async (id: string) => {
      const isNum = !isNaN(Number(id));
      setLibrary((prev) => {
        const nextReactions = { ...prev.reactions };
        const current = nextReactions[id];
        if (current === "dislike") {
          delete nextReactions[id];
        } else {
          nextReactions[id] = "dislike";
          // Dislike removes favorite
          const nextFavorites = prev.favorites.filter((x) => x !== id);
          return { ...prev, reactions: nextReactions, favorites: nextFavorites };
        }
        return { ...prev, reactions: nextReactions };
      });

      if (isNum) {
        try {
          await movieAiApi.toggleDislike(id);
          setBackendStatus("online");
        } catch {
          // Keep local state intact
        }
      }
    },
    [setLibrary]
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const isNum = !isNaN(Number(id));
      setLibrary((prev) => {
        const exists = prev.favorites.includes(id);
        const nextFavorites = exists
          ? prev.favorites.filter((x) => x !== id)
          : [...prev.favorites, id];
        // Favoriting also removes dislike if any
        const nextReactions = { ...prev.reactions };
        if (!exists && nextReactions[id] === "dislike") {
          delete nextReactions[id];
        }
        return { ...prev, favorites: nextFavorites, reactions: nextReactions };
      });

      if (isNum) {
        try {
          await movieAiApi.toggleFavorite(id);
          setBackendStatus("online");
        } catch {
          // Keep local state intact
        }
      }
    },
    [setLibrary]
  );

  const toggleWatchlist = useCallback(
    async (id: string) => {
      const isNum = !isNaN(Number(id));
      setLibrary((prev) => {
        const exists = prev.watchlist.includes(id);
        const nextWatchlist = exists
          ? prev.watchlist.filter((x) => x !== id)
          : [...prev.watchlist, id];
        return { ...prev, watchlist: nextWatchlist };
      });

      if (isNum) {
        try {
          await movieAiApi.toggleWatchlist(id);
          setBackendStatus("online");
        } catch {
          // Keep local state intact
        }
      }
    },
    [setLibrary]
  );

  const rateMovie = useCallback(
    async (id: string, stars: number) => {
      const isNum = !isNaN(Number(id));
      setLibrary((prev) => {
        const nextRatings = { ...prev.ratings };
        if (stars <= 0) {
          delete nextRatings[id];
        } else {
          nextRatings[id] = stars;
        }
        return { ...prev, ratings: nextRatings };
      });

      if (isNum) {
        try {
          await movieAiApi.rateMovie(id, stars);
          setBackendStatus("online");
        } catch {
          // Keep local state intact
        }
      }
    },
    [setLibrary]
  );

  const recordWatched = useCallback(
    async (id: string) => {
      const isNum = !isNaN(Number(id));
      setLibrary((prev) => {
        const exists = prev.watched.includes(id);
        const nextWatched = exists
          ? prev.watched.filter((x) => x !== id)
          : [...prev.watched, id];
        const nextHistory = [id, ...prev.history.filter((x) => x !== id)];
        return { ...prev, watched: nextWatched, history: nextHistory };
      });

      if (isNum) {
        try {
          await movieAiApi.recordWatched(id);
          setBackendStatus("online");
        } catch {
          // Keep local state intact
        }
      }
    },
    [setLibrary]
  );

  const reset = useCallback(async () => {
    setName("");
    setEmail("");
    setSelected([]);
    setGenresState([]);
    setLib(initialLibrary);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(LOCAL_STORAGE_GENRES_KEY);
      } catch {
        // ignore
      }
    }
    try {
      await movieAiApi.resetProfile();
      setBackendStatus("online");
    } catch {
      // ignore
    }
    setSyncCounter((c) => c + 1);
  }, []);

  const value = useMemo(
    () => ({
      name,
      email,
      selected,
      genres,
      backendStatus,
      syncCounter,
      setName,
      setEmail,
      setSelected,
      setGenres,
      reset,
      library,
      setLibrary,
      toggleLike,
      toggleDislike,
      toggleFavorite,
      toggleWatchlist,
      rateMovie,
      recordWatched,
      refreshBackendState,
    }),
    [
      name,
      email,
      selected,
      genres,
      backendStatus,
      syncCounter,
      reset,
      library,
      setLibrary,
      toggleLike,
      toggleDislike,
      toggleFavorite,
      toggleWatchlist,
      rateMovie,
      recordWatched,
      refreshBackendState,
      setGenres,
    ]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

const noop = () => {};
const asyncNoop = async () => {};
const fallback: DemoState = {
  name: "",
  email: "",
  selected: [],
  genres: [],
  backendStatus: "offline",
  syncCounter: 0,
  setName: noop,
  setEmail: noop,
  setSelected: noop,
  setGenres: noop,
  reset: noop,
  library: initialLibrary,
  setLibrary: noop,
  toggleLike: asyncNoop,
  toggleDislike: asyncNoop,
  toggleFavorite: asyncNoop,
  toggleWatchlist: asyncNoop,
  rateMovie: asyncNoop,
  recordWatched: asyncNoop,
  refreshBackendState: asyncNoop,
};

export function useMovieDemo() {
  return useContext(DemoContext) ?? fallback;
}
