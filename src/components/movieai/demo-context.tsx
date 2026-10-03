import { createContext, useContext, useState, type ReactNode } from "react";

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
};

const DemoContext = createContext<DemoState | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const reset = () => { setName(""); setEmail(""); setSelected([]); setGenres([]); };
  return <DemoContext.Provider value={{ name, email, selected, genres, setName, setEmail, setSelected, setGenres, reset }}>{children}</DemoContext.Provider>;
}

const noop = () => {};
const fallback: DemoState = { name: "", email: "", selected: [], genres: [], setName: noop, setEmail: noop, setSelected: noop, setGenres: noop, reset: noop };

export function useMovieDemo() {
  // Fallback keeps pages rendering if the provider is momentarily absent (e.g. during hot reload).
  return useContext(DemoContext) ?? fallback;
}
