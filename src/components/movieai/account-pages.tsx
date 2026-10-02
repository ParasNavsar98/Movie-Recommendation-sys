import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell, DemoNotice, passwordScore, Strength, SubmitButton, TextField, validEmail } from "./auth-shell";
import { useMovieDemo } from "./demo-context";

function usePending() {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const proceed = (to: "/verify" | "/onboarding" | "/profile" | "/login", delay = 700) => {
    setBusy(true);
    window.setTimeout(() => { setBusy(false); navigate({ to }); }, delay);
  };
  return { busy, proceed };
}

export function LoginPage() {
  const { email, setEmail } = useMovieDemo();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { busy, proceed } = usePending();
  function submit(event: FormEvent) { event.preventDefault(); if (!validEmail(email)) return setError("Enter a valid email address."); if (!password) return setError("Enter your password."); setError(""); proceed("/profile"); }
  return <AuthShell index="01" title="Welcome back." description="Pick up where your curiosity left off." aside="Every great story begins somewhere."><form onSubmit={submit} noValidate><TextField label="Email address" type="email" value={email} onChange={(value) => { setEmail(value); setError(""); }} placeholder="you@example.com" autoComplete="email" /><TextField label="Password" type="password" value={password} onChange={(value) => { setPassword(value); setError(""); }} autoComplete="current-password" />{error && <p role="alert" className="text-sm text-signal">{error}</p>}<div className="flex justify-end"><Link to="/forgot-password" className="technical border-b border-foreground pb-1 hover:text-signal">Forgot password?</Link></div><SubmitButton busy={busy}>Log in / preview profile</SubmitButton></form><DemoNotice /><p className="mt-9 text-sm text-muted-foreground">New to MOVIEAI? <Link to="/signup" className="font-semibold text-foreground underline underline-offset-4">Create an account</Link></p></AuthShell>;
}

export function SignupPage() {
  const { name, setName, email, setEmail } = useMovieDemo();
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, proceed } = usePending();
  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Full name is required.";
    if (!validEmail(email)) next.email = "Enter a valid email address.";
    if (passwordScore(password) < 3) next.password = "Use at least 8 characters, an uppercase letter, and a number or symbol.";
    if (password !== confirm) next.confirm = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length === 0) proceed("/verify");
  }
  return <AuthShell index="02" title="Create your account." description="Start a more personal way to discover what to watch." aside="A world of films. A point of view that is yours."><form onSubmit={submit} noValidate><TextField label="Full name" value={name} onChange={(v) => { setName(v); setErrors({ ...errors, name: "" }); }} error={errors.name} autoComplete="name" placeholder="Your name" /><TextField label="Email address" type="email" value={email} onChange={(v) => { setEmail(v); setErrors({ ...errors, email: "" }); }} error={errors.email} autoComplete="email" placeholder="you@example.com" /><TextField label="Password" type="password" value={password} onChange={(v) => { setPassword(v); setErrors({ ...errors, password: "" }); }} error={errors.password} autoComplete="new-password" /><Strength password={password} /><TextField label="Confirm password" type="password" value={confirm} onChange={(v) => { setConfirm(v); setErrors({ ...errors, confirm: "" }); }} error={errors.confirm} autoComplete="new-password" /><SubmitButton busy={busy}>Create account / continue preview</SubmitButton></form><DemoNotice /><p className="mt-8 text-sm text-muted-foreground">Already have an account? <Link to="/login" className="font-semibold text-foreground underline underline-offset-4">Log in</Link></p></AuthShell>;
}

export function VerifyPage() {
  const { email } = useMovieDemo(); const { busy, proceed } = usePending(); const [count, setCount] = useState(30); const [notice, setNotice] = useState("");
  useEffect(() => { if (count <= 0) return; const timer = window.setTimeout(() => setCount(count - 1), 1000); return () => window.clearTimeout(timer); }, [count]);
  return <AuthShell index="03" title="Check your email." description="This is a preview of the verification step. No email has actually been sent." aside="The best discoveries are worth the wait."><div className="flex items-center gap-4 border-y border-border py-6"><Mail size={24} /><div><p className="technical text-muted-foreground">EMAIL ADDRESS</p><p className="mt-1 break-all text-lg">{email || "you@example.com"}</p></div></div><p className="mt-6 text-sm leading-relaxed text-muted-foreground">In a live account flow, a verification link would arrive in your inbox. Continue below to preview what happens next.</p><Button variant="editorialDark" onClick={() => proceed("/onboarding")} disabled={busy} className="mt-8 h-14 w-full justify-between px-5 font-mono text-[11px] uppercase">{busy ? "Opening…" : "Preview verified state"}<ArrowRight /></Button><Button variant="editorialOutline" disabled={count > 0} onClick={() => { setCount(30); setNotice("Preview only — no email was sent."); }} className="mt-3 h-12 w-full font-mono text-[11px] uppercase">{count > 0 ? `Resend available in ${count}s` : "Resend email"}</Button>{notice && <p role="status" className="mt-3 text-sm text-muted-foreground">{notice}</p>}<Link to="/signup" className="technical mt-6 inline-flex gap-2 border-b border-foreground pb-1"><ArrowLeft size={13} /> Change email</Link><DemoNotice /></AuthShell>;
}

export function ForgotPage() {
  const { email, setEmail } = useMovieDemo(); const [error, setError] = useState(""); const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false);
  function submit(event: FormEvent) { event.preventDefault(); if (!validEmail(email)) return setError("Enter a valid email address."); setError(""); setBusy(true); window.setTimeout(() => { setBusy(false); setSent(true); }, 650); }
  return <AuthShell index="04" title={sent ? "Check your inbox." : "Forgot your password?"} description={sent ? "This is the confirmation preview. No reset link was sent." : "Enter your email to preview the password reset journey."} aside="A new beginning is always one scene away.">{sent ? <><div className="flex gap-4 border-y border-border py-6"><Check size={24} /><p className="break-all">Reset-link preview for <strong>{email}</strong></p></div><Button variant="editorialDark" asChild className="mt-8 h-14 w-full font-mono text-[11px] uppercase"><Link to="/reset-password">Preview reset page <ArrowRight /></Link></Button></> : <form onSubmit={submit} noValidate><TextField label="Email address" type="email" value={email} onChange={(v) => { setEmail(v); setError(""); }} error={error} placeholder="you@example.com" autoComplete="email" /><SubmitButton busy={busy}>Send reset link / preview</SubmitButton></form>}<DemoNotice /><Link to="/login" className="technical mt-8 inline-flex gap-2 border-b border-foreground pb-1"><ArrowLeft size={13} /> Back to login</Link></AuthShell>;
}

export function ResetPage() {
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [errors, setErrors] = useState<Record<string, string>>({}); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  function submit(event: FormEvent) { event.preventDefault(); const next: Record<string, string> = {}; if (passwordScore(password) < 3) next.password = "Use at least 8 characters, an uppercase letter, and a number or symbol."; if (password !== confirm) next.confirm = "Passwords do not match."; setErrors(next); if (Object.keys(next).length === 0) { setBusy(true); window.setTimeout(() => { setBusy(false); setDone(true); }, 650); } }
  return <AuthShell index="05" title={done ? "A fresh start." : "Reset your password."} description={done ? "Your new password is ready in this preview. Nothing has been changed in a real account." : "Choose a strong new password for your account preview."} aside="Make room for what comes next.">{done ? <><div className="border-y border-border py-6 text-base">Password reset preview complete.</div><Button variant="editorialDark" asChild className="mt-8 h-14 w-full font-mono text-[11px] uppercase"><Link to="/login">Return to login <ArrowRight /></Link></Button></> : <form onSubmit={submit} noValidate><TextField label="New password" type="password" value={password} onChange={(v) => { setPassword(v); setErrors({ ...errors, password: "" }); }} error={errors.password} autoComplete="new-password" /><Strength password={password} /><TextField label="Confirm password" type="password" value={confirm} onChange={(v) => { setConfirm(v); setErrors({ ...errors, confirm: "" }); }} error={errors.confirm} autoComplete="new-password" /><SubmitButton busy={busy}>Reset password / preview</SubmitButton></form>}<DemoNotice /><Link to="/login" className="technical mt-8 inline-flex gap-2 border-b border-foreground pb-1"><ArrowLeft size={13} /> Back to login</Link></AuthShell>;
}
