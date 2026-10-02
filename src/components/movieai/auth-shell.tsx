import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/cinematic-hero.jpg";
import { useMovieDemo } from "./demo-context";

export function Brand({ light = false }: { light?: boolean }) {
  return <Link to="/" aria-label="MOVIEAI home" className={`inline-flex items-center gap-2 text-[22px] font-bold ${light ? "text-hero-foreground" : "text-foreground"}`}><span className="h-3 w-3 bg-primary" /> MOVIEAI<span className="text-signal">.</span></Link>;
}

export function AuthShell({ index, title, description, children, aside = "Your next favorite film is out there." }: { index: string; title: string; description?: string; children: ReactNode; aside?: string }) {
  return <main className="grid min-h-screen lg:grid-cols-[52%_48%]">
    <section className="site-grid flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 lg:py-9">
      <div className="flex items-center justify-between"><Brand /><span className="technical text-muted-foreground">{index} / MOVIEAI</span></div>
      <div className="mx-auto flex w-full max-w-[490px] flex-1 flex-col justify-center py-16"><div key={title} className="reveal"><div className="technical mb-7 flex items-center gap-2 text-signal"><span className="h-2 w-2 bg-primary" /> THE MOVIEAI EXPERIENCE</div><h1 className="display text-[clamp(3.25rem,5.2vw,5.7rem)]">{title}</h1>{description && <p className="mt-6 max-w-[420px] text-base leading-relaxed text-muted-foreground">{description}</p>}<div className="mt-10">{children}</div></div></div>
      <div className="flex justify-between gap-4 border-t border-border pt-4"><span className="technical text-muted-foreground">A frontend concept / no account is created</span><Link to="/" className="technical inline-flex items-center gap-1 hover:text-signal"><ArrowLeft size={12} /> Home</Link></div>
    </section>
    <aside className="relative hidden min-h-screen overflow-hidden bg-foreground text-hero-foreground lg:block"><img src={hero} alt="A lone figure beneath an arch facing a glowing eclipse" width={1536} height={1024} className="absolute inset-0 h-full w-full object-cover" /><div className="hero-shade absolute inset-0" /><div className="relative flex h-full flex-col justify-between p-12"><span className="technical">MOVIEAI / STORIES THAT STAY WITH YOU</span><div><span className="technical text-primary">NO. 001 / THE BEGINNING</span><p className="display mt-5 max-w-[570px] text-[clamp(3.5rem,5vw,6.7rem)]">{aside}</p><div className="mt-10 flex justify-between border-t border-hero-foreground/40 pt-5"><span className="technical">THE ART OF DISCOVERY</span><ArrowUpRight size={20} /></div></div></div></aside>
  </main>;
}

export function DemoNotice() { return <p className="mt-5 border-l-2 border-signal pl-3 text-xs leading-relaxed text-muted-foreground">Preview only — no email is sent, no password is checked, and nothing is saved after refresh.</p>; }

export function TextField({ label, type = "text", value, onChange, error, placeholder, autoComplete }: { label: string; type?: string; value: string; onChange: (value: string) => void; error?: string; placeholder?: string; autoComplete?: string }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return <div className="mb-5"><label className="technical mb-2 block" htmlFor={label.replaceAll(" ", "-").toLowerCase()}>{label}</label><div className={`flex h-13 items-center border-b bg-transparent transition-colors focus-within:border-foreground ${error ? "border-signal" : "border-border"}`}><input id={label.replaceAll(" ", "-").toLowerCase()} value={value} onChange={(event) => onChange(event.target.value)} type={isPassword ? (visible ? "text" : "password") : type} placeholder={placeholder} autoComplete={autoComplete} aria-invalid={!!error} aria-describedby={error ? `${label}-error` : undefined} className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/60" />{isPassword && <Button type="button" variant="ghost" size="icon" onClick={() => setVisible(!visible)} aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} title={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} className="shrink-0"><span className="sr-only">{visible ? "Hide" : "Show"}</span>{visible ? <EyeOff /> : <Eye />}</Button>}</div>{error && <p id={`${label}-error`} role="alert" className="mt-2 text-xs text-signal">{error}</p>}</div>;
}

export function Strength({ password }: { password: string }) {
  const score = passwordScore(password);
  if (!password) return null;
  return <div className="mb-5"><div className="flex gap-1">{[1, 2, 3, 4].map((n) => <span key={n} className={`h-1 flex-1 ${score >= n ? "bg-primary" : "bg-border"}`} />)}</div><p className="technical mt-2 text-muted-foreground">Password strength / {score <= 1 ? "Weak" : score <= 2 ? "Fair" : score === 3 ? "Good" : "Strong"}</p></div>;
}
export function passwordScore(value: string) { return (value.length >= 8 ? 1 : 0) + (/[A-Z]/.test(value) ? 1 : 0) + (/[0-9]/.test(value) ? 1 : 0) + (/[^A-Za-z0-9]/.test(value) ? 1 : 0); }
export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export function SubmitButton({ children, disabled = false, busy = false }: { children: ReactNode; disabled?: boolean; busy?: boolean }) { return <Button variant="editorialDark" disabled={disabled || busy} type="submit" className="group mt-4 h-14 w-full justify-between px-5 font-mono text-[11px] uppercase"><span>{busy ? "Please wait…" : children}</span><ArrowUpRight className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></Button>; }
export function UserGreeting() { const { name } = useMovieDemo(); return name || "Movie lover"; }
