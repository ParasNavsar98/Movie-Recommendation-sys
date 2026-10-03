import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUpRight, Check, Search, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "./auth-shell";
import { useMovieDemo } from "./demo-context";
import { genreChoices, onboardingFilms } from "./film-data";

const MIN = 5;
const languages = ["All", "English", "Japanese", "French"];
const filmLanguage: Record<string, string> = { "far-side": "English", "after-sun": "French", "where-we-go": "English", "night-signal": "Japanese", "the-green": "English", northbound: "French", "blue-hour": "Japanese", elsewhere: "English" };

function StepShell({ step, children }: { step: string; children: React.ReactNode }) {
  return <main className="site-grid min-h-screen px-5 py-6 sm:px-10">
    <header className="mx-auto flex max-w-[1400px] items-center justify-between border-b border-border pb-5"><Brand /><span className="technical text-muted-foreground">{step}</span></header>
    <div className="reveal mx-auto max-w-[1400px] py-12 md:py-16">{children}</div>
  </main>;
}

export function OnboardingPage() {
  const { selected, setSelected } = useMovieDemo();
  const navigate = useNavigate();
  const [query, setQuery] = useState(""); const [genre, setGenre] = useState("All"); const [lang, setLang] = useState("All"); const [skipAsk, setSkipAsk] = useState(false);
  const genres = ["All", ...Array.from(new Set(onboardingFilms.map((f) => f.genre)))];
  const films = useMemo(() => onboardingFilms.filter((f) => f.title.toLowerCase().includes(query.toLowerCase().trim()) && (genre === "All" || f.genre === genre) && (lang === "All" || filmLanguage[f.id] === lang)), [query, genre, lang]);
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((s) => s !== id) : selected.length >= 10 ? selected : [...selected, id]);
  const ready = selected.length >= MIN;
  return <StepShell step="STEP 01 / 03 — YOUR TASTE">
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
      <div><span className="technical text-signal">◼ MOVIE PREFERENCES</span><h1 className="display mt-6 text-[clamp(3rem,7vw,7.5rem)]">Let's understand<br />your taste.</h1><p className="mt-6 max-w-[520px] text-lg text-muted-foreground">Pick at least 5 movies you already love. We'll use your choices to create your first recommendations.</p></div>
      <div className="border-t border-foreground pt-4"><p className="technical" aria-live="polite"><span className={ready ? "text-foreground" : "text-signal"}>{selected.length}</span> / {MIN} movies selected</p><div className="mt-3 flex gap-1">{Array.from({ length: MIN }, (_, i) => <span key={i} className={`h-1.5 flex-1 transition-colors duration-500 ${i < selected.length ? "bg-primary" : "bg-border"}`} />)}</div></div>
    </div>

    <div className="mt-12 flex flex-col gap-4 border-y border-border py-4 md:flex-row md:items-center">
      <label className="flex h-11 flex-1 items-center gap-3"><Search size={16} /><span className="sr-only">Search movies</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles…" className="h-full flex-1 bg-transparent outline-none placeholder:text-muted-foreground/60" /></label>
      <div className="flex flex-wrap gap-2">{genres.map((g) => <button key={g} onClick={() => setGenre(g)} aria-pressed={genre === g} className={`technical min-h-11 border px-3 transition-colors ${genre === g ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"}`}>{g}</button>)}</div>
      <label className="technical flex items-center gap-2">Language<select value={lang} onChange={(e) => setLang(e.target.value)} className="min-h-11 border border-border bg-transparent px-2">{languages.map((l) => <option key={l}>{l}</option>)}</select></label>
      {selected.length > 0 && <button onClick={() => setSelected([])} className="technical inline-flex min-h-11 items-center gap-1 hover:text-signal"><X size={13} /> Clear</button>}
    </div>

    {films.length === 0 ? <div className="py-24 text-center"><p className="display text-4xl">No films found.</p><p className="mt-3 text-muted-foreground">Try a different title, genre or language.</p></div> :
    <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{films.map((f, i) => { const on = selected.includes(f.id); return <button key={f.id} onClick={() => toggle(f.id)} aria-pressed={on} style={{ animationDelay: `${i * 60}ms` }} className={`reveal group relative text-left transition-transform duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground ${on ? "scale-[0.97]" : "hover:-translate-y-1"}`}>
      <div className={`relative aspect-[4/5] overflow-hidden border-4 transition-colors ${on ? "border-primary" : "border-transparent"}`}><img src={f.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /><span className={`absolute right-3 top-3 grid h-8 w-8 place-items-center bg-primary text-primary-foreground transition-all duration-300 ${on ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}><Check size={18} /></span><span className="technical absolute bottom-3 left-3 bg-background px-2 py-1">★ {f.rating}</span></div>
      <p className="mt-3 text-lg font-semibold">{f.title}</p><p className="technical text-muted-foreground">{f.year} / {f.genre}</p></button>; })}</div>}

    <div className="sticky bottom-0 mt-10 flex flex-col-reverse items-stretch gap-3 border-t border-foreground bg-background/95 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      {skipAsk ? <p className="text-sm text-muted-foreground">Recommendations will be less personal. <button onClick={() => navigate({ to: "/onboarding/genres" })} className="underline underline-offset-4">Skip anyway</button> · <button onClick={() => setSkipAsk(false)} className="underline underline-offset-4">Keep choosing</button></p> : <button onClick={() => setSkipAsk(true)} className="technical min-h-11 text-left text-muted-foreground hover:text-foreground">Skip for now</button>}
      <Button variant="editorialDark" disabled={!ready} onClick={() => navigate({ to: "/onboarding/genres" })} className="h-14 justify-between gap-6 px-6 font-mono text-[11px] uppercase">{ready ? "Build my recommendations" : `Select ${MIN - selected.length} more`} <ArrowUpRight /></Button>
    </div>
  </StepShell>;
}

export function GenresPage() {
  const { genres, setGenres } = useMovieDemo(); const navigate = useNavigate();
  const toggle = (g: string) => setGenres(genres.includes(g) ? genres.filter((x) => x !== g) : [...genres, g]);
  return <StepShell step="STEP 02 / 03 — OPTIONAL">
    <span className="technical text-signal">◼ GENRES</span><h1 className="display mt-6 text-[clamp(3rem,7vw,7.5rem)]">What do you<br />usually enjoy?</h1><p className="mt-6 max-w-[480px] text-lg text-muted-foreground">Optional. Pick any genres that feel like you.</p>
    <div className="mt-12 flex max-w-[900px] flex-wrap gap-3">{genreChoices.map((g, i) => { const on = genres.includes(g); return <button key={g} onClick={() => toggle(g)} aria-pressed={on} style={{ animationDelay: `${i * 50}ms` }} className={`reveal inline-flex min-h-14 items-center gap-2 rounded-full border px-6 text-lg font-semibold transition-all duration-300 ${on ? "scale-105 border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground"}`}>{on && <Check size={16} />}{g}</button>; })}</div>
    <div className="mt-16 flex flex-col-reverse gap-3 border-t border-foreground pt-5 sm:flex-row sm:justify-between">
      <Button variant="editorialOutline" onClick={() => { setGenres([]); navigate({ to: "/onboarding/complete" }); }} className="h-14 px-6 font-mono text-[11px] uppercase">Skip for now</Button>
      <Button variant="editorialDark" onClick={() => navigate({ to: "/onboarding/complete" })} className="h-14 justify-between gap-6 px-6 font-mono text-[11px] uppercase">Continue <ArrowUpRight /></Button>
    </div>
  </StepShell>;
}

const stages = ["User preferences", "Movie profile", "Recommendation engine", "Your movies"];

export function CompletePage() {
  const { selected, genres } = useMovieDemo();
  const [stage, setStage] = useState(0);
  useEffect(() => { if (stage > stages.length) return; const t = window.setTimeout(() => setStage(stage + 1), 900); return () => window.clearTimeout(t); }, [stage]);
  const done = stage > stages.length;
  const picks = onboardingFilms.filter((f) => selected.includes(f.id));
  const recs = onboardingFilms.filter((f) => !selected.includes(f.id)).concat(picks).slice(0, 4);
  return <StepShell step="STEP 03 / 03 — PROFILE">
    <span className="technical text-signal">◼ TASTE PROFILE</span>
    <h1 key={String(done)} className="display reveal mt-6 text-[clamp(3rem,7vw,7.5rem)]">{done ? <>Your first recommendations<br />are ready.</> : <>Your taste profile<br />is ready.</>}</h1>
    <div className="mt-12 grid gap-10 lg:grid-cols-2">
      <div className="space-y-6 border-t border-foreground pt-5">
        <div><p className="technical text-muted-foreground">MOVIES / {picks.length}</p><p className="mt-2 text-lg">{picks.length ? picks.map((p) => p.title).join(" · ") : "None chosen — we'll start broad."}</p></div>
        <div><p className="technical text-muted-foreground">GENRES / {genres.length}</p><div className="mt-2 flex flex-wrap gap-2">{genres.length ? genres.map((g) => <span key={g} className="technical bg-primary px-3 py-1.5 text-primary-foreground">{g}</span>) : <span className="text-muted-foreground">No genres selected</span>}</div></div>
      </div>
      <div className="border-t border-foreground pt-5" aria-live="polite">
        <p className="technical mb-5">{done ? "COMPLETE" : <span className="animate-pulse">BUILDING YOUR RECOMMENDATIONS…</span>}</p>
        {stages.map((s, i) => <div key={s}><div className={`flex items-center justify-between border px-4 py-3 transition-all duration-500 ${stage > i ? "border-foreground bg-foreground text-background" : stage === i ? "border-foreground" : "border-border text-muted-foreground"}`}><span className="technical">{s}</span>{stage > i ? <Check size={15} className="text-primary" /> : stage === i ? <span className="h-2 w-2 animate-ping bg-signal" /> : null}</div>{i < stages.length - 1 && <ArrowDown size={14} className={`mx-auto my-1 transition-colors ${stage > i ? "text-foreground" : "text-border"}`} />}</div>)}
      </div>
    </div>
    {done && <div className="reveal mt-14"><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{recs.map((f, i) => <div key={f.id} className="reveal" style={{ animationDelay: `${i * 90}ms` }}><div className="aspect-[4/5] overflow-hidden"><img src={f.image} alt="" className="h-full w-full object-cover" /></div><p className="mt-3 font-semibold">{f.title}</p><p className="technical text-muted-foreground">{f.genre} / ★ {f.rating}</p></div>)}</div>
      <Button variant="editorialDark" asChild className="mt-10 h-14 justify-between gap-6 px-6 font-mono text-[11px] uppercase"><Link to="/">Explore my movies <ArrowUpRight /></Link></Button></div>}
  </StepShell>;
}

export function ProfilePage() {
  const { name, email, setName, setEmail, selected, genres, reset } = useMovieDemo(); const navigate = useNavigate();
  const [editing, setEditing] = useState(false); const [draftName, setDraftName] = useState(name); const [draftEmail, setDraftEmail] = useState(email); const [note, setNote] = useState("");
  const favorites = onboardingFilms.filter((f) => selected.includes(f.id));
  const stats = [["Movies watched", favorites.length + 12], ["Ratings", favorites.length + 7], ["Favorites", favorites.length], ["Watchlist", 9]] as const;
  return <StepShell step="PROFILE / PREVIEW">
    <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
      <aside><div className="grid aspect-square w-40 place-items-center bg-foreground text-hero-foreground"><User size={56} /></div>
        {editing ? <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); setName(draftName); setEmail(draftEmail); setEditing(false); setNote("Saved for this preview only."); }}><label className="technical block">Full name<input value={draftName} onChange={(e) => setDraftName(e.target.value)} className="mt-1 h-11 w-full border-b border-border bg-transparent text-base normal-case outline-none focus:border-foreground" /></label><label className="technical block">Email<input type="email" value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} className="mt-1 h-11 w-full border-b border-border bg-transparent text-base normal-case outline-none focus:border-foreground" /></label><div className="flex gap-2"><Button type="submit" variant="editorialDark" className="h-11 font-mono text-[11px] uppercase">Save</Button><Button type="button" variant="editorialOutline" onClick={() => setEditing(false)} className="h-11 font-mono text-[11px] uppercase">Cancel</Button></div></form>
        : <><h1 className="display mt-6 text-5xl">{name || "Movie lover"}</h1><p className="mt-2 break-all text-muted-foreground">{email || "you@example.com"}</p></>}
        {note && <p role="status" className="mt-3 text-sm text-muted-foreground">{note}</p>}
        <div className="mt-8 flex flex-col gap-2">
          {!editing && <Button variant="editorialOutline" onClick={() => { setDraftName(name); setDraftEmail(email); setEditing(true); }} className="h-12 font-mono text-[11px] uppercase">Edit profile</Button>}
          <Button variant="editorialOutline" asChild className="h-12 font-mono text-[11px] uppercase"><Link to="/reset-password">Change password</Link></Button>
          <Button variant="editorialDark" onClick={() => { reset(); navigate({ to: "/login" }); }} className="h-12 font-mono text-[11px] uppercase">Log out</Button>
        </div></aside>
      <section>
        <div className="grid grid-cols-2 border-l border-t border-border md:grid-cols-4">{stats.map(([l, v], i) => <div key={l} className="reveal border-b border-r border-border p-5" style={{ animationDelay: `${i * 80}ms` }}><p className="display text-5xl">{v}</p><p className="technical mt-2 text-muted-foreground">{l}</p></div>)}</div>
        <div className="mt-10"><p className="technical">FAVORITE GENRES</p><div className="mt-3 flex flex-wrap gap-2">{genres.length ? genres.map((g) => <span key={g} className="technical bg-primary px-3 py-1.5 text-primary-foreground">{g}</span>) : <span className="text-muted-foreground">None yet — <Link to="/onboarding/genres" className="underline">add genres</Link></span>}</div></div>
        <div className="mt-10"><p className="technical">FAVORITES</p>{favorites.length ? <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">{favorites.map((f) => <div key={f.id}><div className="aspect-[4/5] overflow-hidden"><img src={f.image} alt="" className="h-full w-full object-cover" /></div><p className="mt-2 font-semibold">{f.title}</p></div>)}</div> : <p className="mt-3 text-muted-foreground">No favorites yet. <Link to="/onboarding" className="underline">Pick some films</Link></p>}</div>
        <p className="mt-10 border-l-2 border-signal pl-3 text-xs text-muted-foreground">Preview only — stats are illustrative and nothing is saved after refresh.</p>
      </section>
    </div>
  </StepShell>;
}
