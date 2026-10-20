import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, CalendarDays, Check, CheckCircle2, Folder, FolderPlus, Heart, LayoutGrid, MessageCircle, MoreHorizontal, Play, Search, ShoppingBag, ThumbsDown, ThumbsUp, User, X } from "lucide-react";
import trailer from "@/assets/goodbye_web.webm";
import { useMovieDemo } from "../demo-context";
import type { Movie } from "../discover-data";
import { demoMerch, demoReviews, demoVotes, ratingCategories, type RatingCategory } from "./mock-reviews";

const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
const cat = (id: RatingCategory) => ratingCategories.find((c) => c.id === id)!;

export function MovieDetailsPage({ movie: m }: { movie: Movie }) {
  const { library: lib, setLibrary } = useMovieDemo();
  const [playing, setPlaying] = useState(false);
  useEffect(() => { setLibrary((l) => ({ ...l, history: [m.id, ...l.history.filter((x) => x !== m.id)] })); window.scrollTo(0, 0); setPlaying(false); }, [m.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const watched = lib.watched.includes(m.id), later = lib.watchlist.includes(m.id), inCollection = lib.collections.includes(m.id), fav = lib.favorites.includes(m.id), reaction = lib.reactions[m.id];
  const set = (fn: Parameters<typeof setLibrary>[0]) => setLibrary(fn);

  return <div className="movie-detail min-h-screen overflow-x-hidden">
    <header className="glass sticky top-0 z-40 border-b border-border">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold"><span className="h-3 w-3 bg-primary" /> MOVIEAI<span className="text-signal">.</span></Link>
        <nav aria-label="Library" className="flex items-center gap-0.5 sm:gap-1">
          <NavIcon label="Release tracker" className="hidden sm:grid"><CalendarDays /></NavIcon>
          <NavIcon label="Watched" className="hidden sm:grid"><CheckCircle2 /></NavIcon>
          <NavIcon label="Watchlist"><Bookmark /></NavIcon>
          <NavIcon label="Collections" className="hidden sm:grid"><Folder /></NavIcon>
          <NavIcon label="Browse" to><LayoutGrid /></NavIcon>
          <NavIcon label="Search" to><Search /></NavIcon>
          <Link to="/profile" aria-label="Profile" className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground"><User size={16} /></Link>
        </nav>
      </div>
    </header>

    {/* Hero */}
    <section className="relative isolate">
      <div className="absolute inset-0 -z-10 h-[520px] md:h-[600px]"><img src={m.image} alt="" className="h-full w-full object-cover opacity-60" /><div className="detail-shade absolute inset-0" /></div>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-5 pb-10 pt-24 md:flex-row md:items-end md:gap-10 md:px-8 md:pt-48">
        <div className="relative w-44 shrink-0 overflow-hidden rounded-2xl border border-border shadow-2xl md:w-64">
          {playing ? <video src={trailer} poster={m.image} autoPlay controls className="aspect-[2/3] w-full object-cover" /> : <><img src={m.image} alt={`${m.title} poster`} className="aspect-[2/3] w-full object-cover" /><button onClick={() => { setPlaying(true); }} className="absolute inset-0 grid place-items-center bg-background/20 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100" aria-label="Play trailer"><span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground"><Play className="ml-0.5" /></span></button></>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="technical text-muted-foreground">Movie • {m.year} • {m.runtime}</p>
          <h1 className="display mt-3 break-words text-[clamp(2.6rem,7vw,5.5rem)]">{m.title}</h1>
          <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:flex sm:flex-wrap">
            <Meta k="Created by" v={m.director} /><Meta k="Country" v={m.country} /><Meta k="Language" v={m.language} /><Meta k="Age rating" v={m.ageRating} />
          </dl>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => set((l) => ({ ...l, watched: toggleIn(l.watched, m.id) }))} aria-pressed={watched} className={`inline-flex h-12 items-center gap-2 rounded-full px-6 font-semibold transition-all ${watched ? "bg-rate-goforit text-background" : "bg-primary text-primary-foreground hover:brightness-110"}`}><Check size={18} />{watched ? "Watched" : "Mark as Watched"}</button>
            <PillButton on={inCollection} onClick={() => set((l) => ({ ...l, collections: toggleIn(l.collections, m.id) }))}><FolderPlus size={16} />{inCollection ? "In collection" : "Collections"}</PillButton>
            <PillButton on={later} onClick={() => set((l) => ({ ...l, watchlist: toggleIn(l.watchlist, m.id) }))}><Bookmark size={16} />{later ? "Saved for later" : "Watch Later"}</PillButton>
            <PillButton on={playing} onClick={() => setPlaying(true)}><Play size={16} />Trailer</PillButton>
          </div>
          <div className="mt-4 flex gap-2">
            <IconToggle label="Like" on={reaction === "like"} onClick={() => set((l) => { const r = { ...l.reactions }; if (r[m.id] === "like") delete r[m.id]; else r[m.id] = "like"; return { ...l, reactions: r }; })}><ThumbsUp /></IconToggle>
            <IconToggle label="Dislike" on={reaction === "dislike"} onClick={() => set((l) => { const r = { ...l.reactions }; if (r[m.id] === "dislike") delete r[m.id]; else r[m.id] = "dislike"; return { ...l, reactions: r }; })}><ThumbsDown /></IconToggle>
            <IconToggle label="Favorite" on={fav} onClick={() => set((l) => ({ ...l, favorites: toggleIn(l.favorites, m.id) }))}><Heart /></IconToggle>
          </div>
        </div>
      </div>
    </section>

    <div className="mx-auto max-w-[1280px] px-5 md:px-8">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-rate-goforit/15 px-4 py-1.5 text-sm font-medium text-rate-goforit">{m.genre}</span>
        {m.tags.map((t) => <span key={t} className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">{t}</span>)}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card title="Overview"><p className="leading-[1.8] text-muted-foreground">{m.description || "No overview is available for this film yet."}</p></Card>
          <Card title="Crew"><div className="flex items-center gap-4"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/20 text-lg font-semibold text-primary">{m.director.split(" ").map((p) => p[0]).join("")}</span><div><p className="font-semibold">{m.director}</p><p className="text-sm text-muted-foreground">{m.directorRoles}</p></div></div>
            {m.cast.length > 0 && <p className="mt-5 text-sm text-muted-foreground"><span className="technical mr-2">Cast</span>{m.cast.join(", ")}</p>}</Card>
          <Ratings movieId={m.id} />
          <ReviewForm movieId={m.id} />
        </div>
        <aside className="min-w-0 space-y-6">
          <Vibe data={m.vibe} />
          <Card title="Merchandise"><div className="flex gap-4"><img src={m.image} alt="" className="h-24 w-20 shrink-0 rounded-lg object-cover" /><div><p className="font-semibold leading-snug">{m.title} — {demoMerch.title}</p><p className="mt-1 text-xs text-muted-foreground">{demoMerch.meta}</p></div></div>
            <button type="button" disabled title="Demo listing — checkout not connected" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-signal font-semibold text-background opacity-90"><ShoppingBag size={16} /> Checkout on Amazon</button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Demo placeholder — no purchase is made.</p></Card>
        </aside>
      </div>

      <ReviewFeed />
    </div>
  </div>;
}

function NavIcon({ label, children, className = "grid", to }: { label: string; children: React.ReactNode; className?: string; to?: boolean }) {
  const cls = `${className} h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground [&_svg]:size-[18px]`;
  return to ? <Link to="/discover" aria-label={label} title={label} className={cls}>{children}</Link> : <Link to="/profile" aria-label={label} title={label} className={cls}>{children}</Link>;
}
function Meta({ k, v }: { k: string; v?: string }) { if (!v) return null; return <div><dt className="technical text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>; }
function PillButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} aria-pressed={on} className={`inline-flex h-12 items-center gap-2 rounded-full border px-5 text-sm font-medium transition-colors ${on ? "border-primary bg-primary/15 text-foreground" : "border-border bg-card/70 hover:border-muted-foreground"}`}>{children}</button>;
}
function IconToggle({ label, on, onClick, children }: { label: string; on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} aria-label={label} aria-pressed={on} title={label} className={`grid h-10 w-10 place-items-center rounded-full border transition-colors [&_svg]:size-4 ${on ? "border-primary bg-primary/20 text-primary-glow [&_svg]:fill-current" : "border-border text-muted-foreground hover:text-foreground"}`}>{children}</button>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-border bg-card p-6"><h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}</section>;
}

function Ratings({ movieId }: { movieId: string }) {
  const votes = demoVotes(movieId);
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const pct = (n: number) => Math.round((n / total) * 100);
  const score = pct(votes.goforit + votes.perfection);
  const r = 80, len = Math.PI * r;
  return <Card title="MOVIEAI Ratings">
    <div className="mx-auto max-w-[260px] text-center">
      <svg viewBox="0 0 200 110" className="w-full" aria-hidden="true"><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--border)" strokeWidth="14" strokeLinecap="round" /><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--rate-goforit)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(score / 100) * len} ${len}`} className="transition-all duration-700" /></svg>
      <p className="-mt-12 text-4xl font-bold">{score}%</p>
      <p className="mt-1 text-sm text-muted-foreground">{votes.goforit + votes.perfection} / {total} Votes</p>
    </div>
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{ratingCategories.map((c) => <div key={c.id} className="rounded-xl bg-background/60 p-3 text-center"><p className={`text-xs font-medium ${c.colorClass}`}>{c.label}</p><p className="mt-1 text-xl font-semibold">{pct(votes[c.id])}%</p><div className="mt-2 h-1 overflow-hidden rounded-full bg-border"><div className={`h-full ${c.bgClass}`} style={{ width: `${pct(votes[c.id])}%` }} /></div></div>)}</div>
    <p className="mt-4 text-xs text-muted-foreground">Demo vote data — real community ratings will appear here.</p>
  </Card>;
}

function ReviewForm({ movieId }: { movieId: string }) {
  const { name, library, setLibrary } = useMovieDemo();
  const [rating, setRating] = useState<RatingCategory | null>(null); const [text, setText] = useState(""); const [posted, setPosted] = useState(false);
  const handle = "@" + (name ? name.toLowerCase().replace(/\s+/g, "") : "guest_viewer");
  useEffect(() => { setRating(null); setText(""); setPosted(false); }, [movieId]);
  const post = () => { if (!rating) return; setLibrary((l) => ({ ...l, ratings: { ...l.ratings, [movieId]: ratingCategories.findIndex((c) => c.id === rating) + 2 } })); setPosted(true); };
  return <Card title="Write a review">
    <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"><User size={16} /></span><span className="font-medium">{handle}</span></div>
    {posted ? <div className="mt-5 rounded-xl border border-rate-goforit/40 bg-rate-goforit/10 p-4 text-sm"><span className={`font-semibold ${cat(rating!).colorClass}`}>{cat(rating!).label}</span> — your review is saved in this preview. {library.ratings[movieId] ? "" : ""}<button onClick={() => setPosted(false)} className="ml-2 underline">Edit</button></div> : <>
      <div role="radiogroup" aria-label="Your MOVIEAI rating" className="mt-5 flex flex-wrap gap-2">{ratingCategories.map((c) => <button key={c.id} role="radio" aria-checked={rating === c.id} onClick={() => setRating(c.id)} className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${rating === c.id ? `${c.bgClass} border-transparent text-background` : `border-border ${c.colorClass} hover:bg-card`}`}>{c.label}</button>)}</div>
      <label className="sr-only" htmlFor="review">Review</label>
      <textarea id="review" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder="Share your thoughts about this movie..." rows={4} className="mt-4 w-full resize-none rounded-xl border border-border bg-background/60 p-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" />
      <div className="mt-3 flex items-center justify-between"><span className="text-xs text-muted-foreground">{text.length} / 1000</span><button onClick={post} disabled={!rating} className="h-10 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40">Post</button></div>
      {!rating && <p className="mt-2 text-xs text-muted-foreground">Pick a rating to post.</p>}
    </>}
  </Card>;
}

function Vibe({ data }: { data: { label: string; value: number }[] }) {
  const colors = ["var(--primary)", "var(--rate-goforit)", "var(--rate-timepass)", "var(--rate-skip)"];
  const C = 2 * Math.PI * 40; let offset = 0;
  return <Card title="Movie Vibe">
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="h-32 w-32 shrink-0 -rotate-90" aria-hidden="true">{data.map((d, i) => { const len = (d.value / 100) * C; const el = <circle key={d.label} cx="50" cy="50" r="40" fill="none" stroke={colors[i % colors.length]} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />; offset += len; return el; })}</svg>
      <ul className="space-y-2 text-sm">{data.map((d, i) => <li key={d.label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />{d.label}<span className="text-muted-foreground">— {d.value}%</span></li>)}</ul>
    </div>
  </Card>;
}

function ReviewFeed() {
  const [spoilers, setSpoilers] = useState(false); const [following, setFollowing] = useState(false); const [all, setAll] = useState(false);
  const [liked, setLiked] = useState<string[]>([]); const [expanded, setExpanded] = useState<string[]>([]);
  const list = demoReviews.filter((r) => !following || r.following).sort((a, b) => b.likes - a.likes);
  const shown = all ? list : list.slice(0, 3);
  return <section className="mt-14 pb-24">
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
      <h2 className="text-2xl font-semibold">Reviews</h2>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="rounded-full border border-border bg-card px-4 py-2">Most Liked</span>
        <label className="flex items-center gap-2"><input type="checkbox" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} className="accent-primary" /> Show Spoilers</label>
        <button role="switch" aria-checked={following} onClick={() => setFollowing(!following)} className="flex items-center gap-2"><span className={`relative h-5 w-9 rounded-full transition-colors ${following ? "bg-primary" : "bg-border"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-all ${following ? "left-[18px]" : "left-0.5"}`} /></span>Following Only</button>
      </div>
    </div>
    <div className="mt-6 space-y-4">{shown.length === 0 && <p className="py-10 text-center text-muted-foreground">No reviews from people you follow yet.</p>}
      {shown.map((r) => { const c = cat(r.rating); const long = r.body.length > 180; const open = expanded.includes(r.id); const isLiked = liked.includes(r.id); return <article key={r.id} className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-background text-sm font-semibold uppercase">{r.user[0]}</span><div><p className="font-medium">@{r.user}</p><p className="text-xs text-muted-foreground">{r.date}</p></div></div><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-background ${c.bgClass}`}>{c.label}</span></div>
        {r.spoiler && !spoilers ? <button onClick={() => setSpoilers(true)} className="mt-4 w-full rounded-xl bg-background/60 p-4 text-left text-sm text-muted-foreground">Contains spoilers — click to reveal</button>
          : <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{long && !open ? r.body.slice(0, 180) + "… " : r.body + " "}{long && !open && <button onClick={() => setExpanded([...expanded, r.id])} className="font-medium text-foreground">more</button>}</p>}
        <div className="mt-4 flex items-center gap-5 text-sm text-muted-foreground"><button onClick={() => setLiked(toggleIn(liked, r.id))} aria-pressed={isLiked} className={`flex items-center gap-1.5 ${isLiked ? "text-rate-skip" : "hover:text-foreground"}`}><Heart size={15} className={isLiked ? "fill-current" : ""} />{r.likes + (isLiked ? 1 : 0)}</button><span className="flex items-center gap-1.5"><MessageCircle size={15} />{r.replies}</span><button aria-label="More options" className="ml-auto hover:text-foreground"><MoreHorizontal size={16} /></button></div>
      </article>; })}</div>
    {list.length > 3 && <button onClick={() => setAll(!all)} className="mt-6 h-12 w-full rounded-full border border-border bg-card text-sm font-medium hover:border-muted-foreground">{all ? "Show fewer reviews" : `Show All Reviews (${list.length})`}</button>}
    <p className="mt-4 text-center text-xs text-muted-foreground">Sample reviews shown for preview purposes.</p>
  </section>;
}

export function MovieNotFound() {
  return <div className="movie-detail grid min-h-screen place-items-center px-5 text-center"><div><X className="mx-auto text-rate-skip" size={40} /><h1 className="display mt-6 text-5xl">Movie not found</h1><p className="mt-3 text-muted-foreground">We couldn't find that film. It may have been removed or the link is wrong.</p><Link to="/discover" className="mt-8 inline-flex h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground">Back to discover</Link></div></div>;
}
