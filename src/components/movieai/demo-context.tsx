import { createContext, useContext, useState, type ReactNode } from "react";

export type Reaction = "like" | "dislike";
export type Library = { reactions: Record<string, Reaction>; ratings: Record<string, number>; favorites: string[]; watchlist: string[]; history: string[]; watched: string[]; collections: string[] };
export const initialLibrary: Library = { reactions: { "where-we-go": "like" }, ratings: { "where-we-go": 5 }, favorites: ["elsewhere"], watchlist: ["night-signal", "blue-hour"], history: ["where-we-go", "the-green"], watched: ["where-we-go"], collections: [] };

type DemoState = {
  name: string;
  email: string;
  selected: string[];
  genres: string[];
  setName: (value: string) => void;
  setEmail: (value: string) => void;
  setSelected: (value: string[]) => void;
  setGenres: (value: string[]) => void;
  reset: () => void;
  library: Library;
  setLibrary: (fn: (l: Library) => Library) => void;
};

const DemoContext = createContext<DemoState | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [library, setLib] = useState<Library>(initialLibrary);
  const setLibrary = (fn: (l: Library) => Library) => setLib(fn);
  const reset = () => { setName(""); setEmail(""); setSelected([]); setGenres([]); setLib(initialLibrary); };
  return <DemoContext.Provider value={{ name, email, selected, genres, setName, setEmail, setSelected, setGenres, reset, library, setLibrary }}>{children}</DemoContext.Provider>;
}

const noop = () => {};
const fallback: DemoState = { name: "", email: "", selected: [], genres: [], setName: noop, setEmail: noop, setSelected: noop, setGenres: noop, reset: noop, library: initialLibrary, setLibrary: noop };

export function useMovieDemo() {
  // Fallback keeps pages rendering if the provider is momentarily absent (e.g. during hot reload).
  return useContext(DemoContext) ?? fallback;
}
