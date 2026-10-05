import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Clock, Heart, History, Play, Search, SlidersHorizontal, Star, ThumbsDown, ThumbsUp, TrendingUp, User, X } from "lucide-react";
import Aurora from "@/components/Aurora";
import { Button } from "@/components/ui/button";
import trailer from "@/assets/goodbye_web.webm";
import { useMovieDemo, type Library as Lib, type Reaction } from "./demo-context";
import { genres, languages, movies, ratingSteps, years, type Movie } from "./discover-data";

const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
const byId = (id: string) => movies.find((m) => m.id === id)!;

export function DiscoverPage() {
  const { name, email, library: lib, setLibrary: setLib } = useMovieDemo();
  const navigate = useNavigate();
  const [query, setQuery] = useState(""); const [focused, setFocused] = useState(false); const [recent, setRecent] = useState(["Hana Lindqvist", "Night Signal", "Idris Vance"]);
  const [genre, setGenre] = useState("All"); const [language, setLanguage] = useState("All"); const [year, setYear] = useState("All"); const [minRating, setMinRating] = useState(0);
  const [panel, setPanel] = useState(false); const [tab, setTab] = useState<"history" | "watchlist" | "favorites">("history");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const close = (e: MouseEvent) => { if (!searchRef.current?.contains(e.target as Node)) setFocused(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);

  const q = query.toLowerCase().trim();
  const filtered = useMemo(() => movies.filter((m) =>
    (!q || [m.title, m.director, ...m.cast].some((s) => s.toLowerCase().includes(q))) &&
    (genre === "All" || m.genre === genre) && (language === "All" || m.language === language) &&
    (year === "All" || String(m.year) === year) && m.rating >= minRating), [q, genre, language, year, minRating]);

  const likedGenres = new Set(Object.entries(lib.reactions).filter(([, r]) => r === "like").map(([id]) => byId(id).genre).concat(lib.favorites.map((id) => byId(id).genre)));
  const disliked = new Set(Object.entries(lib.reactions).filter(([, r]) => r === "dislike").map(([id]) => id));
  const recommended = [...movies].filter((m) => !disliked.has(m.id)).sort((a, b) => Number(likedGenres.has(b.genre)) - Number(likedGenres.has(a.genre)) || b.rating - a.rating);
  const featured = recommended[0] ?? movies[0]!;
  const lastWatched = lib.history[0] ? byId(lib.history[0]) : undefined;
  const because = lastWatched ? movies.filter((m) => m.id !== lastWatched.id && (m.genre === lastWatched.genre || m.director === lastWatched.director || m.cast.some((c) => lastWatched.cast.includes(c)))) : [];
  const genreRow = genre !== "All" ? movies.filter((m) => m.genre === genre) : movies.filter((m) => likedGenres.has(m.genre));
  const filtersActive = genre !== "All" || language !== "All" || year !== "All" || minRating > 0;

  const actions = {
    react: (id: string, r: Reaction) => setLib((l) => { const next = { ...l.reactions }; if (next[id] === r) delete next[id]; else next[id] = r; return { ...l, reactions: next }; }),
    rate: (id: string, n: number) => setLib((l) => ({ ...l, ratings: { ...l.ratings, [id]: n } })),
    fav: (id: string) => setLib((l) => ({ ...l, favorites: toggleIn(l.favorites, id) })),
    watch: (id: string) => setLib((l) => ({ ...l, watchlist: toggleIn(l.watchlist, id) })),
    open: (m: Movie) => { navigate({ to: "/movie/$movieId", params: { movieId: m.id } }); setLib((l) => ({ ...l, history: [m.id, ...l.history.filter((x) => x !== m.id)] })); },
  };
  const submitSearch = () => { if (q) setRecent((r) => [query.trim(), ...r.filter((x) => x !== query.trim())].slice(0, 5)); setFocused(false); document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" }); };
  const resetFilters = () => { setGenre("All"); setLanguage("All"); setYear("All"); setMinRating(0); };

  return <div className="cinema min-h-screen">
    <header className="glass sticky top-0 z-40 border-b border-border">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-10">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold"><span className="h-3 w-3 bg-primary" /> MOVIEAI<span className="text-signal">.</span></Link>
        <nav className="hidden gap-8 md:flex">{[["For you", "for-you"], ["Explore", "explore"], ["Genres", "genres"]].map(([l, id]) => <a key={id} href={`#${id}`} className="technical text-muted-foreground transition-colors hover:text-foreground">{l}</a>)}</nav>
        <div className="flex items-center gap-2">
          {!name && <Link to="/login" className="technical hidden px-3 hover:text-primary sm:block">Log in</Link>}
          {!name && <Button asChild size="sm" className="hidden rounded-full font-mono text-[10px] uppercase sm:inline-flex"><Link to="/signup">Register</Link></Button>}
          <Button variant="ghost" size="icon" onClick={() => setPanel(true)} aria-label="Open profile" className="rounded-full border border-border"><User /></Button>
        </div>
      </div>
    </header>

    <section className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-80"><Aurora colorStops={["#00FF9C", "#00C9B7", "#071014"]} amplitude={2.1} blend={0.5} /></div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-background to-transparent" />
      <div className="mx-auto max-w-[1100px] px-5 pb-16 pt-16 md:pt-24">
        <p className="technical text-primary">◼ {name ? `Welcome back, ${name.split(" ")[0]}` : "Discover"}</p>
        <h1 className="display mt-5 text-[clamp(2.8rem,7vw,6.5rem)]">What will you<br />watch tonight?</h1>

        <div ref={searchRef} className="relative mt-10">
          <div className="glass search-glow rounded-2xl border border-border px-5 py-4 md:px-6 md:py-5">
            <div className="flex items-center gap-4">
              <Search className="shrink-0 text-muted-foreground" size={26} />
              <label className="sr-only" htmlFor="movie-search">Search movies, actors or directors</label>
              <input id="movie-search" value={query} onFocus={() => setFocused(true)} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); if (e.key === "Escape") setFocused(false); }} placeholder="Search movies, actors, directors…" className="min-w-0 flex-1 bg-transparent text-xl outline-none placeholder:text-muted-foreground/70 md:text-3xl" />
              {query && <button onClick={() => setQuery("")} aria-label="Clear search" className="text-muted-foreground hover:text-foreground"><X /></button>}
            </div>
            <p className="ml-[42px] mt-1 text-xs text-muted-foreground">Press Enter to see all results</p>
          </div>
          {focused && <div className="glass absolute inset-x-0 top-full z-30 mt-3 max-h-[420px] overflow-y-auto rounded-2xl border border-border p-5">
            {!q && recent.length > 0 && <><div className="flex justify-between"><span className="technical text-muted-foreground">Recent</span><button onClick={() => setRecent([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button></div>
              <div className="mt-3 flex flex-wrap gap-2">{recent.map((r) => <span key={r} className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"><button onClick={() => setQuery(r)} className="inline-flex items-center gap-2"><Clock size={14} />{r}</button><button aria-label={`Remove ${r}`} onClick={() => setRecent(recent.filter((x) => x !== r))} className="text-muted-foreground hover:text-foreground"><X size={13} /></button></span>)}</div></>}
            <p className="technical mt-5 flex items-center gap-2 text-signal first:mt-0"><TrendingUp size={14} /> {q ? `Results / ${filtered.length}` : "Trending"}</p>
            {(q ? filtered : [...movies].sort((a, b) => b.rating - a.rating)).slice(0, 5).map((m) => <button key={m.id} onClick={() => { actions.open(m); setFocused(false); }} className="mt-2 flex w-full items-center gap-4 rounded-lg p-2 text-left transition-colors hover:bg-muted">
              <img src={m.image} alt="" className="h-14 w-11 rounded-md object-cover" /><span><span className="block font-semibold">{m.title}</span><span className="text-sm text-muted-foreground">{m.year} · <Star size={12} className="inline fill-signal text-signal" /> {m.rating} · {m.director}</span></span></button>)}
            {q && filtered.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No titles, actors or directors match "{query}".</p>}
          </div>}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <SlidersHorizontal size={16} className="mr-1 text-muted-foreground" />
          <FilterSelect label="Genre" value={genre} options={genres} onChange={setGenre} />
          <FilterSelect label="Language" value={language} options={languages} onChange={setLanguage} />
          <FilterSelect label="Year" value={year} options={years} onChange={setYear} />
          <FilterSelect label="Rating" value={String(minRating)} options={ratingSteps.map(String)} format={(v) => (v === "0" ? "Any" : `${v}+`)} onChange={(v) => setMinRating(Number(v))} />
          {filtersActive && <button onClick={resetFilters} className="technical px-2 text-muted-foreground hover:text-foreground">Reset</button>}
        </div>
      </div>
    </section>

    <main className="mx-auto max-w-[1440px] space-y-20 px-5 pb-24 md:px-10">
      <section id="for-you" className="grid scroll-mt-24 overflow-hidden rounded-3xl border border-border bg-card md:grid-cols-[1.2fr_1fr]">
        <div className="relative min-h-[300px] overflow-hidden"><img src={featured.image} alt={featured.title} className="absolute inset-0 h-full w-full object-cover" /></div>
        <div className="flex flex-col justify-center p-7 md:p-12">
          <span className="technical text-primary">Top pick for you</span>
          <h2 className="display mt-4 text-5xl md:text-6xl">{featured.title}</h2>
          <p className="technical mt-4 text-muted-foreground">{featured.year} / {featured.genre} / {featured.language} / ★ {featured.rating}</p>
          <p className="mt-5 max-w-md text-muted-foreground">{featured.description}</p>
          <div className="mt-8 flex flex-wrap gap-3"><Button onClick={() => actions.open(featured)} className="rounded-full px-6"><Play /> Watch trailer</Button><Button variant="outline" onClick={() => actions.watch(featured.id)} className="rounded-full border-border bg-transparent px-6"><Bookmark className={lib.watchlist.includes(featured.id) ? "fill-primary text-primary" : ""} /> {lib.watchlist.includes(featured.id) ? "In watchlist" : "Watchlist"}</Button></div>
        </div>
      </section>

      <Row title="Recommended for you" meta="Based on your likes & favorites" items={recommended.slice(0, 8)} lib={lib} actions={actions} />
      {lastWatched && because.length > 0 && <Row title={`Because you watched ${lastWatched.title}`} meta="Same genre, director or cast" items={because} lib={lib} actions={actions} />}
      <div id="genres" className="scroll-mt-24">{genreRow.length > 0 ? <Row title={genre !== "All" ? `Best in ${genre}` : `More ${[...likedGenres].join(" & ")}`} meta="Genre recommendations" items={genreRow} lib={lib} actions={actions} /> : <p className="text-muted-foreground">Like a few films to unlock genre recommendations.</p>}</div>

      <section id="explore" className="scroll-mt-24">
        <SectionHead title="Trending / Explore" meta={`${filtered.length} films${q ? ` matching "${query}"` : ""}`} />
        {filtered.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">{filtered.map((m) => <MovieCard key={m.id} movie={m} lib={lib} actions={actions} />)}</div>
          : <div className="rounded-2xl border border-dashed border-border py-20 text-center"><p className="text-xl">No films match these filters.</p><Button variant="link" onClick={() => { resetFilters(); setQuery(""); }}>Clear search & filters</Button></div>}
      </section>
    </main>

    {panel && <ProfilePanel name={name} email={email} lib={lib} tab={tab} setTab={setTab} onClose={() => setPanel(false)} onOpen={(m) => { setPanel(false); actions.open(m); }} />}
  </div>;
}

type Actions = { react: (id: string, r: Reaction) => void; rate: (id: string, n: number) => void; fav: (id: string) => void; watch: (id: string) => void; open: (m: Movie) => void };

function FilterSelect({ label, value, options, onChange, format = (v) => v }: { label: string; value: string; options: string[]; onChange: (v: string) => void; format?: (v: string) => string }) {
  const active = value !== "All" && value !== "0";
  return <label className={`technical inline-flex h-10 items-center gap-2 rounded-full border px-4 transition-colors ${active ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{label}
    <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-foreground outline-none">{options.map((o) => <option key={o} value={o} className="bg-card">{format(o)}</option>)}</select></label>;
}

function SectionHead({ title, meta }: { title: string; meta: string }) {
  return <div className="mb-6 flex items-end justify-between gap-4 border-t border-border pt-4"><h2 className="text-2xl font-semibold uppercase md:text-3xl">{title}</h2><span className="technical shrink-0 text-muted-foreground">{meta}</span></div>;
}

function Row({ title, meta, items, lib, actions }: { title: string; meta: string; items: Movie[]; lib: Lib; actions: Actions }) {
  return <section><SectionHead title={title} meta={meta} /><div className="no-scrollbar -mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 md:gap-6">{items.map((m) => <div key={m.id} className="w-[60vw] shrink-0 snap-start sm:w-[260px]"><MovieCard movie={m} lib={lib} actions={actions} /></div>)}</div></section>;
}

function MovieCard({ movie: m, lib, actions }: { movie: Movie; lib: Lib; actions: Actions }) {
  const r = lib.reactions[m.id];
  return <article className="group transition-transform duration-300 hover:-translate-y-1.5">
    <div className="notch-card relative aspect-[3/4] overflow-hidden bg-muted">
      <Link to="/movie/$movieId" params={{ movieId: m.id }} className="absolute inset-0" aria-label={`Open ${m.title}`}><img src={m.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /></Link>
      <span className="technical pointer-events-none absolute left-3 top-3 rounded-full bg-background/80 px-2.5 py-1 backdrop-blur"><Star size={10} className="mr-1 inline fill-signal text-signal" />{m.rating}</span>
      <div className="absolute inset-x-2 bottom-2 flex justify-between rounded-xl bg-background/80 p-1 backdrop-blur md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <IconAction label="Like" on={r === "like"} onClick={() => actions.react(m.id, "like")}><ThumbsUp /></IconAction>
        <IconAction label="Dislike" on={r === "dislike"} onClick={() => actions.react(m.id, "dislike")}><ThumbsDown /></IconAction>
        <IconAction label="Favorite" on={lib.favorites.includes(m.id)} onClick={() => actions.fav(m.id)}><Heart /></IconAction>
        <IconAction label="Watchlist" on={lib.watchlist.includes(m.id)} onClick={() => actions.watch(m.id)}><Bookmark /></IconAction>
      </div>
    </div>
    <h3 className="mt-3 truncate font-semibold">{m.title}</h3>
    <p className="technical text-muted-foreground">{m.year} / {m.genre}</p>
  </article>;
}

function IconAction({ label, on, onClick, children }: { label: string; on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} aria-label={label} aria-pressed={on} title={label} className={`grid h-10 w-10 place-items-center rounded-lg transition-colors [&_svg]:size-4 ${on ? "text-primary [&_svg]:fill-primary/30" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{children}</button>;
}

function MovieModal({ movie: m, lib, actions, onClose }: { movie: Movie; lib: Lib; actions: Actions; onClose: () => void }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const myRating = lib.ratings[m.id] ?? 0;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm md:items-center md:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={m.title}>
    <div onClick={(e) => e.stopPropagation()} className="reveal relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-border bg-card md:rounded-3xl">
      <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/80"><X size={18} /></button>
      <div className="relative aspect-video bg-background">{playing ? <video src={trailer} poster={m.image} autoPlay controls className="h-full w-full object-cover" /> : <><img src={m.image} alt={m.title} className="h-full w-full object-cover" /><button onClick={() => setPlaying(true)} className="absolute inset-0 grid place-items-center"><span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-110"><Play className="ml-1" /></span><span className="sr-only">Play trailer</span></button></>}</div>
      <div className="grid gap-8 p-6 md:grid-cols-[1.4fr_1fr] md:p-10">
        <div>
          <p className="technical text-primary">{m.genre} / {m.language}</p>
          <h2 className="display mt-3 text-4xl md:text-5xl">{m.title}</h2>
          <p className="technical mt-3 text-muted-foreground">{m.year} · {m.runtime} · ★ {m.rating}</p>
          <p className="mt-5 leading-relaxed text-muted-foreground">{m.description}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => setPlaying(true)} className="rounded-full"><Play /> Trailer</Button>
            <Button variant="outline" onClick={() => actions.fav(m.id)} className="rounded-full border-border bg-transparent"><Heart className={lib.favorites.includes(m.id) ? "fill-primary text-primary" : ""} /> Favorite</Button>
            <Button variant="outline" onClick={() => actions.watch(m.id)} className="rounded-full border-border bg-transparent"><Bookmark className={lib.watchlist.includes(m.id) ? "fill-primary text-primary" : ""} /> Watchlist</Button>
          </div>
        </div>
        <div className="space-y-5 border-t border-border pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <div><p className="technical text-muted-foreground">Director</p><p className="mt-1">{m.director}</p></div>
          <div><p className="technical text-muted-foreground">Cast</p><p className="mt-1">{m.cast.join(", ")}</p></div>
          <div><p className="technical text-muted-foreground">Your rating</p><div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => actions.rate(m.id, n)} aria-label={`Rate ${n} of 5`}><Star className={`size-6 transition-colors ${n <= myRating ? "fill-signal text-signal" : "text-muted-foreground hover:text-foreground"}`} /></button>)}</div></div>
          <div className="flex gap-2"><IconAction label="Like" on={lib.reactions[m.id] === "like"} onClick={() => actions.react(m.id, "like")}><ThumbsUp /></IconAction><IconAction label="Dislike" on={lib.reactions[m.id] === "dislike"} onClick={() => actions.react(m.id, "dislike")}><ThumbsDown /></IconAction></div>
        </div>
      </div>
    </div>
  </div>;
}

function ProfilePanel({ name, email, lib, tab, setTab, onClose, onOpen }: { name: string; email: string; lib: Lib; tab: "history" | "watchlist" | "favorites"; setTab: (t: "history" | "watchlist" | "favorites") => void; onClose: () => void; onOpen: (m: Movie) => void }) {
  const lists = { history: lib.history, watchlist: lib.watchlist, favorites: lib.favorites };
  const icons = { history: History, watchlist: Bookmark, favorites: Heart };
  const items = lists[tab].map(byId);
  return <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-sm" onClick={onClose}>
    <aside onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card p-6" aria-label="Profile">
      <div className="flex items-start justify-between"><div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground"><User /></span><div><p className="text-lg font-semibold">{name || "Guest viewer"}</p><p className="text-sm text-muted-foreground">{email || "Not signed in"}</p></div></div><button onClick={onClose} aria-label="Close profile"><X /></button></div>
      <div className="mt-6 grid grid-cols-3 gap-2 text-center">{[["Ratings", Object.keys(lib.ratings).length], ["Likes", Object.values(lib.reactions).filter((r) => r === "like").length], ["Watched", lib.history.length]].map(([l, v]) => <div key={l} className="rounded-xl bg-muted p-3"><p className="text-2xl font-semibold">{v}</p><p className="technical text-muted-foreground">{l}</p></div>)}</div>
      <div className="mt-6 flex gap-1 rounded-full bg-muted p-1">{(Object.keys(lists) as (keyof typeof lists)[]).map((t) => { const I = icons[t]; return <button key={t} onClick={() => setTab(t)} className={`technical flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 transition-colors ${tab === t ? "bg-background text-foreground" : "text-muted-foreground"}`}><I size={13} />{t} ({lists[t].length})</button>; })}</div>
      <div className="mt-4 flex-1 space-y-2">{items.length ? items.map((m) => <button key={m.id} onClick={() => onOpen(m)} className="flex w-full items-center gap-4 rounded-xl p-2 text-left hover:bg-muted"><img src={m.image} alt="" className="h-16 w-12 rounded-md object-cover" /><span><span className="block font-semibold">{m.title}</span><span className="technical text-muted-foreground">{m.year} / {m.genre}{lib.ratings[m.id] ? ` / ${lib.ratings[m.id]}★ yours` : ""}</span></span></button>) : <p className="py-12 text-center text-sm text-muted-foreground">Nothing here yet.</p>}</div>
      <div className="mt-6 flex gap-2 border-t border-border pt-5">{name ? <Button asChild variant="outline" className="flex-1 rounded-full border-border bg-transparent"><Link to="/profile">Full profile</Link></Button> : <><Button asChild className="flex-1 rounded-full"><Link to="/signup">Register</Link></Button><Button asChild variant="outline" className="flex-1 rounded-full border-border bg-transparent"><Link to="/login">Log in</Link></Button></>}</div>
      <p className="mt-4 text-xs text-muted-foreground">Preview only — your activity resets on refresh.</p>
    </aside>
  </div>;
}
