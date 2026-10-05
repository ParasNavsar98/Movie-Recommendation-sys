import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell, DemoNotice, passwordScore, Strength, SubmitButton, TextField, validEmail } from "./auth-shell";
import { useMovieDemo } from "./demo-context";

function usePending() {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const proceed = (to: "/verify" | "/onboarding" | "/profile", delay = 700) => {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      navigate({ to });
    }, delay);
  };
  return { busy, proceed };
}

export function LoginPage() {
  const { email, setEmail } = useMovieDemo();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { busy, proceed } = usePending();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!validEmail(email)) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    setError("");
    proceed("/profile");
  }

  return (
    <AuthShell index="01" title="Welcome back." description="Pick up where your curiosity left off.">
      <form onSubmit={submit} noValidate>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            setError("");
          }}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setError("");
          }}
          autoComplete="current-password"
        />
        {error && <p role="alert" className="mb-3 font-mono text-xs text-red-400">{error}</p>}

        <div className="flex justify-end -mt-1 mb-4">
          <Link to="/forgot-password" className="font-mono text-xs text-neutral-400 hover:text-[#7cff67] transition-colors">
            Forgot Password?
          </Link>
        </div>

        <SubmitButton busy={busy}>Sign In</SubmitButton>
      </form>

      <DemoNotice />

      <p className="mt-6 text-center text-sm font-sans text-neutral-400">
        New to MOVIEAI?{" "}
        <Link to="/signup" className="font-semibold text-white hover:text-[#7cff67] underline underline-offset-4 transition-colors">
          Create Account
        </Link>
      </p>
    </AuthShell>
  );
}

export function SignupPage() {
  const { name, setName, email, setEmail } = useMovieDemo();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, proceed } = usePending();

  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next["name"] = "Full name is required.";
    if (!validEmail(email)) next["email"] = "Enter a valid email address.";
    if (passwordScore(password) < 3)
      next["password"] = "Use at least 8 characters, an uppercase letter, and a number or symbol.";
    if (password !== confirm) next["confirm"] = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length === 0) proceed("/verify");
  }

  return (
    <AuthShell index="02" title="Create Account." description="Start a more personal way to discover what to watch.">
      <form onSubmit={submit} noValidate>
        <TextField
          label="Name"
          value={name}
          onChange={(v) => {
            setName(v);
            setErrors({ ...errors, name: "" });
          }}
          error={errors["name"]}
          autoComplete="name"
          placeholder="Your full name"
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            setErrors({ ...errors, email: "" });
          }}
          error={errors["email"]}
          autoComplete="email"
          placeholder="you@example.com"
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            setErrors({ ...errors, password: "" });
          }}
          error={errors["password"]}
          autoComplete="new-password"
        />
        <Strength password={password} />
        <TextField
          label="Confirm Password"
          type="password"
          value={confirm}
          onChange={(v) => {
            setConfirm(v);
            setErrors({ ...errors, confirm: "" });
          }}
          error={errors["confirm"]}
          autoComplete="new-password"
        />
        <SubmitButton busy={busy}>Create Account</SubmitButton>
      </form>

      <DemoNotice />

      <p className="mt-6 text-center text-sm font-sans text-neutral-400">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-white hover:text-[#7cff67] underline underline-offset-4 transition-colors">
          Back to Sign In
        </Link>
      </p>
    </AuthShell>
  );
}

export function VerifyPage() {
  const { email } = useMovieDemo();
  const { busy, proceed } = usePending();
  const [count, setCount] = useState(30);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (count <= 0) return;
    const timer = window.setTimeout(() => setCount(count - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [count]);

  return (
    <AuthShell index="03" title="Check your email." description="This is a preview of the verification step. No email has actually been sent.">
      <div className="flex items-center gap-4 border-y border-white/10 py-5 my-2">
        <Mail size={22} className="text-[#7cff67] shrink-0" />
        <div>
          <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">EMAIL ADDRESS</p>
          <p className="font-mono text-sm text-white mt-0.5 break-all">{email || "you@example.com"}</p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-neutral-400 font-sans">
        In a live account flow, a verification link would arrive in your inbox. Continue below to preview what happens next.
      </p>
      <Button
        onClick={() => proceed("/onboarding")}
        disabled={busy}
        className="mt-6 h-12 w-full justify-between px-5 font-sans font-semibold text-sm uppercase tracking-wider bg-[#7cff67] text-black hover:bg-[#6ee659] rounded-xl transition-all border-0 shadow-[0_0_20px_rgba(124,255,103,0.2)]"
      >
        <span>{busy ? "Opening…" : "Preview verified state"}</span>
        <ArrowRight size={16} />
      </Button>
      <Button
        variant="outline"
        disabled={count > 0}
        onClick={() => {
          setCount(30);
          setNotice("Preview only — no email was sent.");
        }}
        className="mt-3 h-11 w-full font-mono text-xs uppercase bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white rounded-xl"
      >
        {count > 0 ? `Resend available in ${count}s` : "Resend email"}
      </Button>
      {notice && <p role="status" className="mt-2 text-xs font-mono text-neutral-400">{notice}</p>}

      <div className="mt-6 text-center">
        <Link to="/signup" className="font-mono text-xs text-neutral-400 hover:text-[#7cff67] inline-flex items-center gap-1.5 transition-colors">
          <ArrowLeft size={13} /> Change email
        </Link>
      </div>

      <DemoNotice />
    </AuthShell>
  );
}

export function ForgotPage() {
  const { email, setEmail } = useMovieDemo();
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!validEmail(email)) return setError("Enter a valid email address.");
    setError("");
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setSent(true);
    }, 650);
  }

  return (
    <AuthShell
      index="04"
      title={sent ? "Check your inbox." : "Forgot password?"}
      description={sent ? "This is the confirmation preview. No reset link was sent." : "Enter your email to receive a password reset link."}
    >
      {sent ? (
        <>
          <div className="flex items-center gap-3 border-y border-white/10 py-5 my-2">
            <Check size={20} className="text-[#7cff67] shrink-0" />
            <p className="font-mono text-xs text-neutral-300 break-all">
              Reset link sent preview for <span className="text-white font-semibold">{email}</span>
            </p>
          </div>
          <Button
            asChild
            className="mt-6 h-12 w-full font-sans font-semibold text-sm uppercase tracking-wider bg-[#7cff67] text-black hover:bg-[#6ee659] rounded-xl transition-all border-0 shadow-[0_0_20px_rgba(124,255,103,0.2)]"
          >
            <Link to="/reset-password" className="flex items-center justify-center gap-2">
              Preview Reset Page <ArrowRight size={16} />
            </Link>
          </Button>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(v) => {
              setEmail(v);
              setError("");
            }}
            error={error}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <SubmitButton busy={busy}>Send Reset Link</SubmitButton>
        </form>
      )}

      <DemoNotice />

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="font-mono text-xs text-neutral-400 hover:text-[#7cff67] inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={13} /> Back to Sign In
        </Link>
      </div>
    </AuthShell>
  );
}

export function ResetPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (passwordScore(password) < 3)
      next["password"] = "Use at least 8 characters, an uppercase letter, and a number or symbol.";
    if (password !== confirm) next["confirm"] = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length === 0) {
      setBusy(true);
      window.setTimeout(() => {
        setBusy(false);
        setDone(true);
      }, 650);
    }
  }

  return (
    <AuthShell
      index="05"
      title={done ? "A fresh start." : "Reset your password."}
      description={
        done
          ? "Your new password is ready in this preview. Nothing has been changed in a real account."
          : "Choose a strong new password for your account preview."
      }
    >
      {done ? (
        <>
          <div className="border-y border-white/10 py-5 my-2 font-mono text-xs text-neutral-300">
            Password reset preview complete.
          </div>
          <Button
            asChild
            className="mt-6 h-12 w-full font-sans font-semibold text-sm uppercase tracking-wider bg-[#7cff67] text-black hover:bg-[#6ee659] rounded-xl transition-all border-0 shadow-[0_0_20px_rgba(124,255,103,0.2)]"
          >
            <Link to="/login" className="flex items-center justify-center gap-2">
              Return to Sign In <ArrowRight size={16} />
            </Link>
          </Button>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <TextField
            label="New password"
            type="password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              setErrors({ ...errors, password: "" });
            }}
            error={errors["password"]}
            autoComplete="new-password"
          />
          <Strength password={password} />
          <TextField
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(v) => {
              setConfirm(v);
              setErrors({ ...errors, confirm: "" });
            }}
            error={errors["confirm"]}
            autoComplete="new-password"
          />
          <SubmitButton busy={busy}>Reset Password</SubmitButton>
        </form>
      )}

      <DemoNotice />

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="font-mono text-xs text-neutral-400 hover:text-[#7cff67] inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={13} /> Back to Sign In
        </Link>
      </div>
    </AuthShell>
  );
}
