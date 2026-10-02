import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Heart, Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/cinematic-hero.jpg";
import desertImage from "@/assets/cinematic-desert.jpg";
import oceanImage from "@/assets/cinematic-ocean.jpg";
import cityImage from "@/assets/cinematic-city.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MOVIEAI — Movies made for your taste" },
      { name: "description", content: "Explore a cinematic movie-discovery concept shaped around your taste. Find a film that feels like yours." },
      { property: "og:title", content: "MOVIEAI — Movies made for your taste" },
      { property: "og:description", content: "A cinematic movie-discovery concept shaped around your taste." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const films = [
  { id: "01", title: "The Far Side", genre: "Sci-fi", mood: "Wonder", year: "2026", image: heroImage, alt: "A lone figure faces an eclipse over the sea", note: "For the worlds you want to get lost in" },
  { id: "02", title: "After the Sun", genre: "Adventure", mood: "Wonder", year: "2025", image: desertImage, alt: "A traveler crosses sunlit desert dunes", note: "For the long way home" },
  { id: "03", title: "Where We Go", genre: "Drama", mood: "Feeling", year: "2024", image: oceanImage, alt: "A woman looks toward a lighthouse across a stormy sea", note: "For stories that stay with you" },
  { id: "04", title: "Night Signal", genre: "Thriller", mood: "Intensity", year: "2025", image: cityImage, alt: "A lone figure walks through a rain-soaked city at night", note: "For the edge of your seat" },
];

const moods = ["Wonder", "Feeling", "Intensity"];
const genres = ["All films", "Sci-fi", "Adventure", "Drama", "Thriller"];

function Index() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mood, setMood] = useState("Wonder");
  const [genre, setGenre] = useState("All films");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string[]>([]);

  const suggested = films.find((film) => film.mood === mood) ?? films[0];
  const visibleFilms = useMemo(() => films.filter((film) =>
    (genre === "All films" || film.genre === genre) &&
    `${film.title} ${film.genre} ${film.mood}`.toLowerCase().includes(query.toLowerCase().trim())
  ), [genre, query]);

  const toggleSave = (id: string) => setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const closeMenu = () => setMenuOpen(false);

  return (
    <main>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between px-5 md:px-10">
          <a href="#top" onClick={closeMenu} aria-label="MOVIEAI home" className="flex items-center gap-2 text-[22px] font-bold leading-none">
            <span className="inline-block h-3 w-3 bg-primary" aria-hidden="true" /> MOVIEAI<span className="text-signal">.</span>
          </a>
          <nav aria-label="Main navigation" className="hidden items-center gap-10 md:flex">
            <a className="technical transition-colors hover:text-signal" href="#discover">Discover</a>
            <a className="technical transition-colors hover:text-signal" href="#how-it-works">How it works</a>
            <a className="technical transition-colors hover:text-signal" href="#your-taste">Your taste</a>
          </nav>
          <Button variant="editorialDark" size="lg" asChild className="hidden h-10 px-5 font-mono text-[10px] uppercase md:inline-flex">
            <a href="#your-taste">Explore your taste <ArrowUpRight /></a>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        {menuOpen && <nav aria-label="Mobile navigation" className="flex flex-col gap-0 border-t border-border bg-background px-5 pb-5 md:hidden">
          {[["Discover", "#discover"], ["How it works", "#how-it-works"], ["Your taste", "#your-taste"]].map(([label, href]) => <a key={href} href={href} onClick={closeMenu} className="border-b border-border py-5 text-2xl font-semibold uppercase">{label}</a>)}
        </nav>}
      </header>

      <section id="top" className="relative isolate flex min-h-[660px] items-end overflow-hidden bg-foreground text-hero-foreground md:min-h-[760px]">
        <img src={heroImage} width={1536} height={1024} alt="A figure beneath a monumental arch looks toward an eclipse over the sea" className="hero-image absolute inset-0 -z-20 h-full w-full" />
        <div className="hero-shade absolute inset-0 -z-10" />
        <div className="mx-auto grid w-full max-w-[1600px] gap-8 px-5 pb-12 pt-32 md:grid-cols-[1fr_220px] md:items-end md:px-10 md:pb-16">
          <div className="reveal">
            <div className="technical mb-7 flex items-center gap-3 text-hero-foreground"><span className="h-2 w-2 bg-primary" /> A new way to find your next film <span className="opacity-60">/ 001</span></div>
            <h1 className="display max-w-[1100px] text-[clamp(3.7rem,8.3vw,9.5rem)]">Movies made<br />for <em className="font-normal not-italic text-primary">your</em> taste.</h1>
            <div className="mt-9 flex flex-col gap-6 md:flex-row md:items-center md:gap-12">
              <Button variant="editorial" size="lg" asChild className="h-14 w-fit px-7 font-mono text-[11px] uppercase"><a href="#your-taste">Start discovering <ArrowUpRight /></a></Button>
              <p className="max-w-[300px] text-sm leading-relaxed text-hero-foreground/85">The best film for tonight isn't the same for everyone. Find the one that feels like you.</p>
            </div>
          </div>
          <a href="#intro" className="technical hidden items-center justify-end gap-3 self-end pb-2 transition-colors hover:text-primary md:flex">Scroll to explore <ArrowDown size={16} /></a>
        </div>
        <div className="absolute right-5 top-6 hidden border border-hero-foreground/50 px-3 py-2 text-hero-foreground md:block"><span className="technical">An editorial film experience ↗</span></div>
      </section>

      <section id="intro" className="site-grid border-b border-border py-7">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 md:px-10">
          <span className="technical text-muted-foreground">01 / The idea</span>
          <p className="max-w-[770px] text-xl font-medium leading-snug md:text-[32px]">Less endless scrolling. <span className="text-muted-foreground">More movies that actually mean something to you.</span></p>
          <span className="technical text-muted-foreground">Made for curious minds ↗</span>
        </div>
      </section>

      <section id="how-it-works" className="site-grid border-b border-border py-24 md:py-36">
        <div className="mx-auto max-w-[1600px] px-5 md:px-10">
          <div className="mb-16 flex items-start justify-between gap-8 border-t border-foreground pt-5"><span className="technical">02 / The process</span><span className="technical text-muted-foreground">Simple by design</span></div>
          <div className="grid gap-12 md:grid-cols-[1.25fr_.75fr] md:gap-24">
            <h2 className="display max-w-[850px] text-[clamp(3.3rem,6.6vw,7.6rem)]">You watch.<br />You feel.<br /><span className="text-signal">We learn.</span></h2>
            <div className="flex flex-col justify-end"><p className="mb-12 max-w-[400px] text-lg leading-relaxed text-muted-foreground">The films you love say more than a genre ever could. Each choice paints a clearer picture of what moves you.</p><a href="#your-taste" className="technical group flex w-fit items-center gap-3 border-b border-foreground pb-2">Find your feeling <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></a></div>
          </div>
          <div className="mt-20 grid border-t border-border md:grid-cols-4">
            {[["01", "Watch", "Find what catches your eye."], ["02", "React", "Keep what stays with you."], ["03", "Connect", "Notice the stories you return to."], ["04", "Discover", "See a new side of your taste."]].map(([num, title, copy]) => <div key={num} className="min-h-[190px] border-b border-border p-5 md:border-b-0 md:border-r md:last:border-r-0"><span className="technical text-signal">{num} / 04</span><h3 className="mt-12 text-2xl font-semibold uppercase">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{copy}</p></div>)}
          </div>
        </div>
      </section>

      <section id="your-taste" className="bg-foreground py-24 text-hero-foreground md:py-32">
        <div className="mx-auto max-w-[1600px] px-5 md:px-10">
          <div className="mb-14 flex justify-between border-t border-hero-foreground/30 pt-5"><span className="technical text-primary">03 / Your taste</span><span className="technical text-hero-foreground/50">An interactive preview</span></div>
          <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <div>
              <h2 className="display max-w-[700px] text-[clamp(3.3rem,6vw,7.2rem)]">What are you<br /><span className="text-primary">in the mood</span><br />for?</h2>
              <p className="mt-8 max-w-[440px] text-base leading-relaxed text-hero-foreground/65">A place to begin. Choose a feeling and see where it takes you.</p>
              <div role="group" aria-label="Choose a mood" className="mt-12 max-w-[550px] border-t border-hero-foreground/30">
                {moods.map((item, index) => <Button key={item} variant="ghost" onClick={() => setMood(item)} aria-pressed={mood === item} className={`flex h-[76px] w-full justify-between rounded-none border-b border-hero-foreground/30 px-0 text-hero-foreground hover:bg-transparent hover:text-primary ${mood === item ? "text-primary" : ""}`}><span className="flex items-center gap-6 text-2xl font-semibold uppercase"><span className="technical text-hero-foreground/45">0{index + 1}</span>{item}</span><ArrowUpRight /></Button>)}
              </div>
            </div>
            <div className="relative self-end">
              <div className="mb-3 flex justify-between"><span className="technical text-primary">A film for your {mood.toLowerCase()}</span><span className="technical text-hero-foreground/45">Sample selection / 01</span></div>
              <div className="relative aspect-[1.2] overflow-hidden bg-ink-soft md:aspect-[1.28]"><img key={suggested.id} src={suggested.image} alt={suggested.alt} width={1024} height={1280} className="h-full w-full object-cover" loading="lazy" /></div>
              <div className="flex items-end justify-between border-b border-hero-foreground/30 py-5"><div><p className="technical mb-2 text-hero-foreground/50">Selected for you / concept preview</p><h3 className="text-3xl font-semibold uppercase md:text-4xl">{suggested.title}</h3></div><ArrowUpRight size={26} className="text-primary" /></div>
              <p className="mt-4 text-sm text-hero-foreground/65">{suggested.note}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="ticker border-b border-foreground bg-primary py-4 text-foreground" aria-hidden="true"><div className="ticker-track technical text-[12px] font-medium">{Array.from({ length: 8 }, (_, i) => <span key={i}>DISCOVER DIFFERENTLY ✳ FOLLOW YOUR CURIOSITY ✳ FIND YOUR NEXT FAVORITE ✳ </span>)}</div></div>

      <section id="discover" className="site-grid py-24 md:py-32">
        <div className="mx-auto max-w-[1600px] px-5 md:px-10">
          <div className="mb-12 flex justify-between border-t border-foreground pt-5"><span className="technical">04 / The collection</span><span className="technical text-muted-foreground">A selection to explore</span></div>
          <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end"><h2 className="display text-[clamp(3.3rem,6.3vw,7.4rem)]">Find your<br />next favorite<span className="text-signal">.</span></h2><p className="max-w-[290px] text-base leading-relaxed text-muted-foreground">A small collection of imagined films, each with a different feeling.</p></div>
          <div className="mb-8 flex flex-col justify-between gap-5 border-y border-border py-4 lg:flex-row lg:items-center">
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter films by genre">{genres.map((item) => <Button key={item} variant={genre === item ? "editorialDark" : "editorialOutline"} size="sm" className="h-10 shrink-0 px-4 font-mono text-[10px] uppercase" aria-pressed={genre === item} onClick={() => setGenre(item)}>{item}</Button>)}</div>
            <label className="flex h-10 items-center gap-3 border-b border-foreground lg:w-[250px]"><Search size={17} /><span className="sr-only">Search films</span><input className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search the collection" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          </div>
          <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {visibleFilms.map((film) => <article className="film-card group" key={film.id}>
              <div className="relative aspect-[3/4] overflow-hidden bg-muted"><img src={film.image} alt={film.alt} width={1024} height={1280} loading="lazy" className="film-image h-full w-full object-cover" /><span className="technical absolute left-3 top-3 bg-background px-2 py-1.5">{film.genre} / {film.year}</span><Button variant="editorialDark" size="icon" className="absolute bottom-3 right-3 h-10 w-10" onClick={() => toggleSave(film.id)} aria-label={saved.includes(film.id) ? `Remove ${film.title} from saved films` : `Save ${film.title}`} aria-pressed={saved.includes(film.id)} title={saved.includes(film.id) ? "Remove from saved films" : "Save film"}><Heart className={saved.includes(film.id) ? "fill-primary text-primary" : ""} /></Button></div>
              <div className="flex items-start justify-between border-b border-foreground py-4"><div><span className="technical text-muted-foreground">No. {film.id} / {film.mood}</span><h3 className="mt-2 text-2xl font-semibold uppercase">{film.title}</h3></div><ArrowUpRight size={20} className="film-arrow mt-1" /></div>
            </article>)}
          </div>
          {visibleFilms.length === 0 && <div className="border-b border-border py-20 text-center"><p className="text-xl">No films match that search.</p><Button variant="link" onClick={() => { setQuery(""); setGenre("All films"); }}>Clear filters</Button></div>}
          <p className="technical mt-8 text-muted-foreground">Concept collection · Saved films stay on this page only ({saved.length})</p>
        </div>
      </section>

      <section className="relative isolate flex min-h-[560px] items-center overflow-hidden bg-foreground text-hero-foreground"><img src={oceanImage} alt="A figure facing the sea and a distant lighthouse" width={1024} height={1280} loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" /><div className="hero-shade absolute inset-0 -z-10" /><div className="mx-auto w-full max-w-[1600px] px-5 py-24 md:px-10"><span className="technical text-primary">05 / Keep exploring</span><h2 className="display mt-8 max-w-[1000px] text-[clamp(3.6rem,7.2vw,8.5rem)]">The right story<br />finds you.</h2><p className="mt-7 max-w-[440px] text-lg text-hero-foreground/80">Somewhere out there is a film you'll never forget.</p><Button variant="editorial" size="lg" asChild className="mt-9 h-14 px-7 font-mono text-[11px] uppercase"><a href="#your-taste">Follow your taste <ArrowUpRight /></a></Button></div></section>

      <footer className="overflow-hidden bg-background px-5 pt-16 md:px-10"><div className="mx-auto max-w-[1600px]"><div className="flex flex-col justify-between gap-10 border-t border-foreground pt-5 md:flex-row"><div><span className="technical">MOVIEAI / A movie discovery concept</span><p className="mt-5 max-w-[340px] text-sm leading-relaxed text-muted-foreground">A visual exploration of the stories we choose and the stories that choose us.</p></div><div className="flex gap-10"><a className="technical hover:underline" href="#discover">Discover</a><a className="technical hover:underline" href="#how-it-works">The process</a><a className="technical hover:underline" href="#top">Back to top ↑</a></div></div><div className="display mt-20 text-[clamp(5rem,18vw,19rem)] leading-[.75]">MOVIEAI<span className="text-signal">.</span></div><div className="mt-8 flex justify-between border-t border-border py-5"><span className="technical text-muted-foreground">© MOVIEAI / Frontend concept</span><span className="technical text-muted-foreground">Made for movie lovers</span></div></div></footer>
    </main>
  );
}