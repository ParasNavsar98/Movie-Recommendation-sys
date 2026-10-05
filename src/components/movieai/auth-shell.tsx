import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import ColorBends from "@/components/ColorBends";
import { useMovieDemo } from "./demo-context";

export function Brand() {
  return (
    <Link to="/" aria-label="MOVIEAI home" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-white group">
      <span className="h-3.5 w-3.5 bg-[#7cff67] rounded-sm shadow-[0_0_12px_#7cff67] transition-transform group-hover:scale-110" />
      <span className="font-sans font-bold">MOVIEAI</span>
      <span className="text-[#7cff67]">.</span>
    </Link>
  );
}

export function AuthShell({
  index,
  title,
  description,
  children,
}: {
  index: string;
  title: string;
  description?: string;
  children: ReactNode;
  aside?: string;
}) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black overflow-x-hidden selection:bg-[#7cff67] selection:text-black">
      {/* Full-screen ColorBends background */}
      <div className="fixed inset-0 z-0 h-full w-full pointer-events-auto">
        <ColorBends
          rotation={90}
          speed={0.2}
          colors={["#5227FF", "#FF9FFC", "#7cff67"]}
          transparent
          autoRotate={0}
          scale={1}
          frequency={1}
          warpStrength={1}
          mouseInfluence={0.4}
          parallax={0.5}
          noise={0.15}
          iterations={1}
          intensity={1.5}
          bandWidth={6}
          className="h-full w-full"
        />
        {/* Subtle dark vignette to ensure text readability */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/80 pointer-events-none" />
      </div>

      {/* Centered Single Authentication Glass Card */}
      <main className="relative z-10 w-full max-w-[460px] my-auto">
        <div className="w-full bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/12 rounded-3xl p-6 sm:p-8 md:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(124,255,103,0.06)] hover:border-white/20 transition-all duration-300">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-6 border-b border-white/10">
            <Brand />
            <span className="font-mono text-[11px] text-neutral-400 tracking-widest uppercase font-medium">
              {index} / MOVIEAI
            </span>
          </div>

          {/* Heading and Description */}
          <div className="mt-7 mb-7">
            <h1 className="font-sans font-bold text-2xl sm:text-3xl text-white tracking-tight leading-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-sm text-neutral-400 font-sans leading-relaxed">{description}</p>
            )}
          </div>

          {/* Form Content */}
          <div>{children}</div>

          {/* Card Footer */}
          <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between text-xs font-mono text-neutral-400">
            <span className="tracking-wider uppercase text-[10px]">CONCEPT PREVIEW</span>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-neutral-300 hover:text-[#7cff67] transition-colors"
            >
              <ArrowLeft size={13} /> Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export function DemoNotice() {
  return (
    <p className="mt-5 border-l-2 border-[#7cff67] pl-3 font-mono text-[11px] leading-relaxed text-neutral-400">
      Preview only — no email is sent, no password is checked, and nothing is saved after refresh.
    </p>
  );
}

export function TextField({
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputId = label.replaceAll(" ", "-").toLowerCase();

  return (
    <div className="mb-4 text-left">
      <label className="font-mono text-[11px] font-medium text-neutral-300 uppercase tracking-wider mb-2 block" htmlFor={inputId}>
        {label}
      </label>
      <div
        className={`relative flex items-center h-12 w-full rounded-xl bg-neutral-900/90 border transition-all duration-200 ${
          error
            ? "border-red-500/80 focus-within:ring-2 focus-within:ring-red-500/50"
            : "border-neutral-800 focus-within:border-[#7cff67] focus-within:ring-1 focus-within:ring-[#7cff67]"
        }`}
      >
        <input
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={isPassword ? (visible ? "text" : "password") : type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="h-full w-full bg-transparent px-4 font-sans text-sm text-white placeholder:text-neutral-500 outline-none rounded-xl"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            title={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            className="absolute right-3 p-1.5 text-neutral-400 hover:text-white transition-colors rounded-lg focus:outline-none focus:text-[#7cff67]"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 font-mono text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function Strength({ password }: { password: string }) {
  const score = passwordScore(password);
  if (!password) return null;
  return (
    <div className="mb-4">
      <div className="flex gap-1.5 h-1.5">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`h-full flex-1 rounded-full transition-colors duration-300 ${
              score >= n ? "bg-[#7cff67]" : "bg-neutral-800"
            }`}
          />
        ))}
      </div>
      <p className="font-mono text-[11px] mt-2 text-neutral-400">
        Password strength / {score <= 1 ? "Weak" : score <= 2 ? "Fair" : score === 3 ? "Good" : "Strong"}
      </p>
    </div>
  );
}

export function passwordScore(value: string) {
  return (
    (value.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(value) ? 1 : 0) +
    (/[0-9]/.test(value) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(value) ? 1 : 0)
  );
}

export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function SubmitButton({
  children,
  disabled = false,
  busy = false,
}: {
  children: ReactNode;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Button
      type="submit"
      disabled={disabled || busy}
      className="group mt-5 h-12.5 w-full justify-center px-5 font-sans font-semibold text-sm uppercase tracking-wider bg-[#7cff67] text-black hover:bg-[#6ee659] active:scale-[0.99] rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(124,255,103,0.25)] hover:shadow-[0_0_30px_rgba(124,255,103,0.4)] disabled:opacity-50 border-0 cursor-pointer"
    >
      <span className="flex items-center justify-center gap-2">
        {busy ? "Processing…" : children}
        {!busy && (
          <ArrowUpRight
            size={18}
            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        )}
      </span>
    </Button>
  );
}

export function UserGreeting() {
  const { name } = useMovieDemo();
  return name || "Movie lover";
}
