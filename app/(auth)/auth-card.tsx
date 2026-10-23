"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/shell/logo";
import { Button, Field, Input } from "@/components/ui";
import { AUTH_ENABLED } from "@/lib/config";
import { supabaseBrowser } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot" | "reset";

const TITLES: Record<Mode, string> = {
  login: "Welcome back",
  signup: "Create your account",
  forgot: "Reset your password",
  reset: "Choose a new password",
};

/**
 * Supabase Auth (PKCE). Email/password, Google, Apple, forgot/reset password.
 * Without Supabase keys it falls back to the local demo (no real accounts).
 */
export function AuthCard({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(params.get("error") ?? "");

  // Where to go after auth: ?next=… (from the proxy), or Settings checkout when coming from a pricing CTA.
  const plan = params.get("plan");
  const cycle = params.get("cycle") ?? "monthly";
  const next = params.get("next") ?? (plan ? `/settings?tab=Subscription&plan=${plan}&cycle=${cycle}` : null);
  const afterAuth = mode === "signup" ? `/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}` : next ?? "/dashboard";
  const callback = (to: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(to)}`;

  const validate = () => {
    if (mode !== "reset" && !/^\S+@\S+\.\S+$/.test(email)) return "Enter a valid email address.";
    if (mode !== "forgot" && password.length < 8) return "Password must be at least 8 characters.";
    return "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    const problem = validate();
    if (problem) return setError(problem);
    setLoading(true);
    try {
      if (!AUTH_ENABLED) {
        // Demo mode: no real accounts.
        if (mode === "forgot") setNotice(`Demo mode: no email is sent. Connect Supabase to enable password reset.`);
        else router.push(afterAuth);
        return;
      }
      const auth = supabaseBrowser().auth;
      if (mode === "login") {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(afterAuth);
        router.refresh();
      } else if (mode === "signup") {
        const { data, error } = await auth.signUp({ email, password, options: { emailRedirectTo: callback(afterAuth) } });
        if (error) throw error;
        if (data.session) {
          router.replace(afterAuth);
          router.refresh();
        } else {
          setNotice(`Check ${email} — we sent a link to confirm your account.`);
        }
      } else if (mode === "forgot") {
        const { error } = await auth.resetPasswordForEmail(email, { redirectTo: callback("/reset-password") });
        if (error) throw error;
        setNotice(`If an account exists for ${email}, a reset link is on its way.`);
      } else {
        const { error } = await auth.updateUser({ password });
        if (error) throw error;
        router.replace("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const oauth = async (provider: "google" | "apple") => {
    setError("");
    if (!AUTH_ENABLED) return router.push(afterAuth);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider, options: { redirectTo: callback(afterAuth) } });
    if (error) setError(error.message);
  };

  const showPassword = mode !== "forgot";
  const showEmail = mode !== "reset";

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <LogoMark className="size-8" />
          <span className="font-display text-xl font-medium">Smart Content</span>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h1 className="font-display text-xl font-medium">{TITLES[mode]}</h1>
          {mode === "signup" && <p className="mt-1 text-sm text-muted">Includes 100 credits every month. No card needed.</p>}
          {plan && mode !== "reset" && (
            <p className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">
              You picked the <strong className="capitalize">{plan}</strong> plan — you&apos;ll go to test checkout right after.
            </p>
          )}
          {!AUTH_ENABLED && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Demo mode — Supabase isn&apos;t connected, so no real account is created.</p>
          )}

          {notice ? (
            <p role="status" className="mt-4 rounded-lg bg-good-bg p-3 text-sm text-good">{notice}</p>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
              {(mode === "login" || mode === "signup") && (
                <>
                  <div className="grid gap-2">
                    <Button type="button" className="w-full" onClick={() => oauth("google")}>Continue with Google</Button>
                    <Button type="button" className="w-full" onClick={() => oauth("apple")}>Continue with Apple</Button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-subtle"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
                </>
              )}
              {showEmail && (
                <Field label="Email"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
              )}
              {showPassword && (
                <Field label={mode === "reset" ? "New password" : "Password"} hint={mode !== "login" ? "At least 8 characters." : undefined}>
                  <Input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
                </Field>
              )}
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                {{ login: "Log in", signup: "Create account", forgot: "Send reset link", reset: "Update password" }[mode]}
              </Button>
            </form>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          {mode === "login" ? (
            <>New here? <Link className="font-semibold text-accent" href={`/signup${plan ? `?plan=${plan}&cycle=${cycle}` : ""}`}>Create an account</Link> · <Link className="font-semibold text-accent" href="/forgot-password">Forgot password?</Link></>
          ) : mode === "reset" ? null : (
            <>Already have an account? <Link className="font-semibold text-accent" href={`/login${plan ? `?plan=${plan}&cycle=${cycle}` : ""}`}>Log in</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
